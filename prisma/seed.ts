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

async function main() {
  if ((await prisma.periode.count()) > 0) return
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

main().finally(() => prisma.$disconnect())
