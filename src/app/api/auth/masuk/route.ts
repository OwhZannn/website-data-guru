import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { periksaSandi } from '@/lib/sandi'
import { buatSesi, MASA_SESI_MS } from '@/lib/sesi'

const skema = z.object({ email: z.string().min(1), sandi: z.string().min(1) })

// Hash tetap agar pekerjaan scrypt sama untuk email yang tidak dikenal.
const HASH_PALSU =
  'scrypt$f59b512fc943ab90a5c39468b96a61e9$ff56ff602f9dbb4f8022df007cddfedd9e786299bab9aa336e3ce885b750b5178dc89aaa1c52f8cc1303cd8d249309d893a2aa7d44b8c1b7f457ae6b15d89ecd'

const gagal = () =>
  NextResponse.json({ ok: false, pesan: 'Email atau kata sandi salah' }, { status: 401 })

export async function POST(req: Request) {
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal()
  const email = body.data.email.trim().toLowerCase()
  const sandi = body.data.sandi

  const admin = await prisma.admin.findUnique({ where: { email } })
  const guru = admin ? null : await prisma.guru.findUnique({ where: { email } })
  const akun = admin ?? guru
  const tipe = admin ? 'admin' : 'guru'

  const cocok = await periksaSandi(sandi, akun?.hashSandi ?? HASH_PALSU)
  if (!akun || !cocok || !akun.aktif) return gagal()

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
