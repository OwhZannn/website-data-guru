import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashSandi, periksaSandi } from '@/lib/sandi'
import { bolehCobaMasuk, catatGagalMasuk, bersihkanGagalMasuk, kunciMasuk } from '@/lib/pembatas'
import { buatSesi, MASA_SESI_MS } from '@/lib/sesi'

// `username`: email untuk admin, NIP/NIK untuk guru. `email` diterima untuk klien lama.
const skema = z.object({ username: z.string().min(1).optional(), email: z.string().min(1).optional(), sandi: z.string().min(1) })

// Hash asli (dihitung sekali) agar pekerjaan scrypt sama untuk email yang tidak dikenal.
let hashPalsu: Promise<string> | undefined
const ambilHashPalsu = () => (hashPalsu ??= hashSandi('sandi-palsu-tidak-dipakai'))

const gagal = () =>
  NextResponse.json({ ok: false, pesan: 'Username atau kata sandi salah' }, { status: 401 })

export async function POST(req: Request) {
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal()
  const mentah = (body.data.username ?? body.data.email ?? '').trim()
  if (!mentah) return gagal()
  // Ada "@" berarti email admin; selain itu NIP/NIK guru (spasi dan titik diabaikan).
  const pakaiEmail = mentah.includes('@')
  const id = pakaiEmail ? mentah.toLowerCase() : mentah.replace(/[\s.-]/g, '')
  const sandi = body.data.sandi

  const kunci = kunciMasuk(id)
  if (!(await bolehCobaMasuk(kunci))) {
    return NextResponse.json(
      { ok: false, pesan: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 },
    )
  }

  const admin = pakaiEmail ? await prisma.admin.findUnique({ where: { email: id } }) : null
  const guru = pakaiEmail ? null : await prisma.guru.findUnique({ where: { username: id } })
  const akun = admin ?? guru
  const tipe = admin ? 'admin' : 'guru'

  const cocok = await periksaSandi(sandi, akun?.hashSandi ?? (await ambilHashPalsu()))
  if (!akun || !cocok || !akun.aktif) {
    await catatGagalMasuk(kunci)
    return gagal()
  }
  await bersihkanGagalMasuk(kunci)
  // Baru diberi tahu setelah sandi terbukti benar, supaya status pendaftaran orang lain tidak bocor.
  if (guru && !guru.disetujui) {
    return NextResponse.json(
      { ok: false, pesan: 'Akun Anda sedang menunggu persetujuan admin. Coba masuk lagi nanti.' },
      { status: 403 },
    )
  }

  const token = await buatSesi(akun.id, tipe)
  ;(await cookies()).set('sesi', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MASA_SESI_MS / 1000,
  })
  return NextResponse.json({ ok: true, tipe })
}
