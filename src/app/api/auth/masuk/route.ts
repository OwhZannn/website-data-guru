import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashSandi, periksaSandi } from '@/lib/sandi'
import { bolehCobaMasuk, catatGagalMasuk, bersihkanGagalMasuk, kunciMasuk } from '@/lib/pembatas'
import { buatSesi, MASA_SESI_MS } from '@/lib/sesi'

const skema = z.object({ email: z.string().min(1), sandi: z.string().min(1) })

// Hash asli (dihitung sekali) agar pekerjaan scrypt sama untuk email yang tidak dikenal.
let hashPalsu: Promise<string> | undefined
const ambilHashPalsu = () => (hashPalsu ??= hashSandi('sandi-palsu-tidak-dipakai'))

const gagal = () =>
  NextResponse.json({ ok: false, pesan: 'Email atau kata sandi salah' }, { status: 401 })

export async function POST(req: Request) {
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal()
  const email = body.data.email.trim().toLowerCase()
  const sandi = body.data.sandi

  const kunci = kunciMasuk(email)
  if (!(await bolehCobaMasuk(kunci))) {
    return NextResponse.json(
      { ok: false, pesan: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 },
    )
  }

  const admin = await prisma.admin.findUnique({ where: { email } })
  const guru = admin ? null : await prisma.guru.findUnique({ where: { email } })
  const akun = admin ?? guru
  const tipe = admin ? 'admin' : 'guru'

  const cocok = await periksaSandi(sandi, akun?.hashSandi ?? (await ambilHashPalsu()))
  if (!akun || !cocok || !akun.aktif) {
    await catatGagalMasuk(kunci)
    return gagal()
  }
  await bersihkanGagalMasuk(kunci)

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
