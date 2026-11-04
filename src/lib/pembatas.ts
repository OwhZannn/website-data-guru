import { prisma } from '@/lib/db'

const BATAS = 5
const JENDELA_MS = 15 * 60_000

export const kunciMasuk = (email: string) => `masuk:${email.toLowerCase()}`

export async function bolehCobaMasuk(kunci: string): Promise<boolean> {
  const baris = await prisma.percobaanMasuk.findUnique({ where: { kunci } })
  if (!baris) return true
  if (Date.now() - baris.sejak.getTime() > JENDELA_MS) return true
  return baris.gagal < BATAS
}

export async function catatGagalMasuk(kunci: string): Promise<void> {
  const sekarang = new Date()
  const baris = await prisma.percobaanMasuk.findUnique({ where: { kunci } })
  if (!baris || sekarang.getTime() - baris.sejak.getTime() > JENDELA_MS) {
    await prisma.percobaanMasuk.upsert({
      where: { kunci },
      create: { kunci, gagal: 1, sejak: sekarang },
      update: { gagal: 1, sejak: sekarang },
    })
    return
  }
  await prisma.percobaanMasuk.update({ where: { kunci }, data: { gagal: { increment: 1 } } })
}

export async function bersihkanGagalMasuk(kunci: string): Promise<void> {
  await prisma.percobaanMasuk.deleteMany({ where: { kunci } })
}
