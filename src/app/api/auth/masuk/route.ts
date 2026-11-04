import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { periksaSandi } from '@/lib/sandi'
import { buatSesi, MASA_SESI_MS } from '@/lib/sesi'

const skema = z.object({ email: z.string().min(1), sandi: z.string().min(1) })

const gagal = () =>
  NextResponse.json({ ok: false, pesan: 'Email atau kata sandi salah' }, { status: 401 })

export async function POST(req: Request) {
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal()
  const { email, sandi } = body.data

  const admin = await prisma.admin.findUnique({ where: { email } })
  const guru = admin ? null : await prisma.guru.findUnique({ where: { email } })
  const akun = admin ?? guru
  const tipe = admin ? 'admin' : 'guru'

  if (!akun || !akun.aktif || !(await periksaSandi(sandi, akun.hashSandi))) return gagal()

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
