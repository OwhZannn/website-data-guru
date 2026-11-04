import type { Prisma, Riwayat } from '@prisma/client'
import { prisma } from '@/lib/db'

export type AksiRiwayat =
  | 'unggah' | 'ganti_file' | 'sahkan' | 'tolak' | 'batalkan'
  | 'buka_periode' | 'tutup_periode' | 'ubah_daftar_dokumen' | 'impor_guru' | 'buat_admin'

export type MasukanRiwayat = {
  periodeId: string
  guruId?: string
  dokumenId?: string
  aksi: AksiRiwayat
  alasan?: string
  oleh: string
  olehTipe: 'guru' | 'admin'
}

// Tambah-saja: tidak ada fungsi yang mengubah atau menghapus riwayat.
export async function catatRiwayat(masukan: MasukanRiwayat, tx: Prisma.TransactionClient = prisma): Promise<void> {
  await tx.riwayat.create({ data: masukan })
}

const terbaruDulu = [{ waktu: 'desc' as const }, { id: 'desc' as const }]

export function daftarRiwayatDokumen(guruId: string, dokumenId: string): Promise<Riwayat[]> {
  return prisma.riwayat.findMany({ where: { guruId, dokumenId }, orderBy: terbaruDulu })
}

export function daftarRiwayatPeriode(
  periodeId: string,
  opsi: { batas?: number; halaman?: number } = {},
): Promise<Riwayat[]> {
  const batas = opsi.batas ?? 50
  return prisma.riwayat.findMany({
    where: { periodeId },
    orderBy: terbaruDulu,
    take: batas,
    skip: (opsi.halaman ?? 0) * batas,
  })
}
