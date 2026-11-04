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

export const TIDAK_DIKENAL = '(tidak dikenal)'

/** Nama pelaku setiap baris riwayat, diambil massal (dua query) lalu digabung di memori. Kunci: id riwayat. */
export async function namaPelakuRiwayat(daftar: Pick<Riwayat, 'id' | 'oleh' | 'olehTipe'>[]): Promise<Map<string, string>> {
  const idAdmin = [...new Set(daftar.filter((r) => r.olehTipe === 'admin').map((r) => r.oleh))]
  const idGuru = [...new Set(daftar.filter((r) => r.olehTipe === 'guru').map((r) => r.oleh))]
  const [admin, guru] = await Promise.all([
    idAdmin.length ? prisma.admin.findMany({ where: { id: { in: idAdmin } }, select: { id: true, nama: true } }) : [],
    idGuru.length ? prisma.guru.findMany({ where: { id: { in: idGuru } }, select: { id: true, nama: true } }) : [],
  ])
  const nAdmin = new Map(admin.map((a) => [a.id, a.nama]))
  const nGuru = new Map(guru.map((g) => [g.id, g.nama]))
  return new Map(daftar.map((r) => [r.id, (r.olehTipe === 'admin' ? nAdmin : nGuru).get(r.oleh) ?? TIDAK_DIKENAL]))
}
