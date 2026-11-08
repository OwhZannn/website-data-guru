import { prisma } from '@/lib/db'

/** Fallback bila tabel AlasanTolak kosong (misalnya DB baru tanpa migrasi seed). */
export const ALASAN_BAWAAN = [
  'File tidak terbaca',
  'Bukan dokumen yang diminta',
  'Sudah kedaluwarsa',
  'Tanda tangan/stempel kurang',
]

/** Daftar teks alasan aktif, diurutkan berdasarkan urutan. */
export async function daftarAlasanAktif(): Promise<string[]> {
  const baris = await prisma.alasanTolak.findMany({
    where: { aktif: true },
    orderBy: [{ urutan: 'asc' }, { dibuatPada: 'asc' }],
    select: { teks: true },
  })
  if (baris.length === 0) return ALASAN_BAWAAN
  return baris.map((b) => b.teks)
}
