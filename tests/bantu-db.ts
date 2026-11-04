import { prisma } from '../src/lib/db'

/** Hapus semua tabel dalam urutan aman terhadap foreign key. Dipakai di beforeEach semua tes DB. */
export async function bersihkanSemua(): Promise<void> {
  await prisma.riwayat.deleteMany()
  await prisma.dokumenGuru.deleteMany()
  await prisma.daftarDokumen.deleteMany()
  await prisma.periode.deleteMany()
  await prisma.sesi.deleteMany()
  await prisma.percobaanMasuk.deleteMany()
  await prisma.guru.deleteMany()
  await prisma.admin.deleteMany()
}
