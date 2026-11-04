import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { hashSandi } from '@/lib/sandi'
import { acakSandiAwal } from '@/lib/imporGuru'

/** Aktif/nonaktif; menonaktifkan juga menghapus semua sesi guru itu. Guru tidak pernah dihapus. */
export async function aturAktifGuru(guruId: string, aktif: boolean): Promise<void> {
  const g = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!g) throw new GalatPengguna('Guru tidak ditemukan')
  await prisma.$transaction(async (tx) => {
    await tx.guru.update({ where: { id: guruId }, data: { aktif } })
    if (!aktif) await tx.sesi.deleteMany({ where: { pemilikId: guruId, tipe: 'guru' } })
  })
}

/** Sandi baru dikembalikan sekali saja; sesi lama guru dihapus. */
export async function aturUlangSandiGuru(guruId: string): Promise<{ sandi: string }> {
  const g = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!g) throw new GalatPengguna('Guru tidak ditemukan')
  const sandi = acakSandiAwal()
  const hash = await hashSandi(sandi)
  await prisma.$transaction(async (tx) => {
    await tx.guru.update({ where: { id: guruId }, data: { hashSandi: hash } })
    await tx.sesi.deleteMany({ where: { pemilikId: guruId, tipe: 'guru' } })
  })
  return { sandi }
}
