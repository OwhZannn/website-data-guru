import { randomBytes } from 'node:crypto'
import { prisma } from './db'

export type TipeSesi = 'guru' | 'admin'
export const MASA_SESI_MS = 14 * 24 * 60 * 60 * 1000

export async function buatSesi(pemilikId: string, tipe: TipeSesi): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await prisma.sesi.create({
    data: { token, pemilikId, tipe, kedaluwarsa: new Date(Date.now() + MASA_SESI_MS) },
  })
  return token
}

export async function bacaSesi(token: string): Promise<{ pemilikId: string; tipe: TipeSesi } | null> {
  const sesi = await prisma.sesi.findUnique({ where: { token } })
  if (!sesi || sesi.kedaluwarsa.getTime() <= Date.now()) return null
  return { pemilikId: sesi.pemilikId, tipe: sesi.tipe as TipeSesi }
}

export async function hapusSesi(token: string): Promise<void> {
  await prisma.sesi.deleteMany({ where: { token } })
}
