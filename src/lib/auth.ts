import { cookies } from 'next/headers'
import type { Admin, Guru } from '@prisma/client'
import { prisma } from './db'
import { bacaSesi, type TipeSesi } from './sesi'

const tidakSah = () => new Response(null, { status: 401 })

async function sesiAktif(tipe: TipeSesi) {
  const token = (await cookies()).get('sesi')?.value
  if (!token) throw tidakSah()
  const sesi = await bacaSesi(token)
  if (!sesi || sesi.tipe !== tipe) throw tidakSah()
  return sesi
}

export async function wajibAdmin(): Promise<Admin> {
  const { pemilikId } = await sesiAktif('admin')
  const admin = await prisma.admin.findUnique({ where: { id: pemilikId } })
  if (!admin || !admin.aktif) throw tidakSah()
  return admin
}

export async function wajibGuru(): Promise<Guru> {
  const { pemilikId } = await sesiAktif('guru')
  const guru = await prisma.guru.findUnique({ where: { id: pemilikId } })
  if (!guru || !guru.aktif) throw tidakSah()
  return guru
}
