import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Contoh untuk pengembangan, bukan daftar resmi. Daftar sungguhan diisi admin (Task 11).
const NAMA_DOKUMEN = [
  'Ijazah S1',
  'Transkrip Nilai',
  'SK Mengajar',
  'Sertifikat Pendidik',
  'Kartu Pegawai',
]

const ALASAN_BAWAAN = [
  { id: 'alasan-01', teks: 'File tidak terbaca', urutan: 1 },
  { id: 'alasan-02', teks: 'Bukan dokumen yang diminta', urutan: 2 },
  { id: 'alasan-03', teks: 'Sudah kedaluwarsa', urutan: 3 },
  { id: 'alasan-04', teks: 'Tanda tangan/stempel kurang', urutan: 4 },
]

async function main() {
  // Seed periode contoh (pengembangan saja)
  if ((await prisma.periode.count()) === 0) {
    await prisma.periode.create({
      data: {
        nama: 'Periode Contoh',
        dibuka: true,
        dokumen: {
          create: NAMA_DOKUMEN.map((nama, i) => ({ nama, urutan: i + 1 })),
        },
      },
    })
  }

  // Seed alasan tolak bawaan (idempotent: hanya tambah yang belum ada)
  if ((await prisma.alasanTolak.count()) === 0) {
    await prisma.alasanTolak.createMany({ data: ALASAN_BAWAAN })
  }
}

main().finally(() => prisma.$disconnect())
