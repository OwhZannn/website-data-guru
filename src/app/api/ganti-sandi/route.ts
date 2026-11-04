import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { wajibGuru } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashSandi, periksaSandi } from '@/lib/sandi'

const skema = z.object({ sandiLama: z.string(), sandiBaru: z.string(), konfirmasi: z.string() })

const gagal = (pesan: string, status = 400) => NextResponse.json({ ok: false, pesan }, { status })

export async function POST(req: Request) {
  let guru
  try {
    guru = await wajibGuru()
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal('Permintaan tidak sah')
  const { sandiLama, sandiBaru, konfirmasi } = body.data

  if (!(await periksaSandi(sandiLama, guru.hashSandi))) return gagal('Kata sandi lama salah')
  if (sandiBaru.length < 8) return gagal('Kata sandi baru minimal 8 karakter')
  if (sandiBaru !== konfirmasi) return gagal('Konfirmasi kata sandi tidak cocok')

  const hash = await hashSandi(sandiBaru)
  const token = (await cookies()).get('sesi')?.value
  await prisma.$transaction([
    prisma.guru.update({ where: { id: guru.id }, data: { hashSandi: hash } }),
    prisma.sesi.deleteMany({
      where: { pemilikId: guru.id, tipe: 'guru', ...(token ? { token: { not: token } } : {}) },
    }),
  ])
  return NextResponse.json({ ok: true })
}
