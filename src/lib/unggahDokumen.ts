import { prisma } from '@/lib/db'
import { folderGuru, unggahKeDrive, hapusDariDrive } from '@/lib/drive'
import { periksaBerkas } from '@/lib/periksaBerkas'
import { catatRiwayat } from '@/lib/riwayat'
import { Prisma } from '@prisma/client'
import { GalatDrive, GalatPengguna } from '@/lib/galat'
import { terjemahkanGalatDrive } from '@/lib/galatDrive'
import { tanggalLokal } from '@/lib/waktu'

const PESAN_SAH = 'Dokumen ini sudah dinyatakan sah'

async function lewatDrive<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f()
  } catch (e) {
    console.error('Drive gagal saat unggah', e)
    throw new GalatDrive(terjemahkanGalatDrive(e).pesan, { cause: e })
  }
}

async function hapusDiam(fileId: string) {
  try {
    await hapusDariDrive(fileId)
  } catch {
    // sengaja ditelan: paling buruk tertinggal file yatim
  }
}

export async function unggahDokumen(masukan: {
  guruId: string
  periodeId: string
  dokumenId: string
  nama: string
  tipe: string
  isi: Buffer
  oleh: string
}): Promise<{ status: string }> {
  const { guruId, periodeId, dokumenId, isi } = masukan

  // 1. Periode harus dibuka.
  const periode = await prisma.periode.findUnique({ where: { id: periodeId } })
  if (!periode?.dibuka) throw new GalatPengguna('Masa pengunggahan sedang ditutup')
  const dokumen = await prisma.daftarDokumen.findUnique({ where: { id: dokumenId } })
  if (!dokumen || !dokumen.aktif || dokumen.periodeId !== periodeId)
    throw new GalatPengguna('Dokumen tidak ditemukan atau tidak aktif')
  const guru = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!guru) throw new GalatPengguna('Guru tidak ditemukan')

  // 2. Dokumen yang sudah sah tidak boleh diganti.
  const lama = await prisma.dokumenGuru.findUnique({
    where: { periodeId_guruId_dokumenId: { periodeId, guruId, dokumenId } },
  })
  if (lama?.status === 'SAH') throw new GalatPengguna(PESAN_SAH)

  // 3. Periksa isi berkas.
  const cek = periksaBerkas({ nama: masukan.nama, tipe: masukan.tipe, isi })
  if (!cek.sah) throw new GalatPengguna(cek.pesan)

  // 4. Unggah ke Drive dulu.
  const sekarang = new Date()
  const ekstensi = cek.tipe === 'application/pdf' ? 'pdf' : 'jpg'
  const namaFile = `${dokumen.nama} - ${tanggalLokal(sekarang)}.${ekstensi}`
  const { fileId } = await lewatDrive(async () =>
    unggahKeDrive({ folderId: await folderGuru(guru.nip, guru.nama), namaFile, tipe: cek.tipe, isi }),
  )

  // 5. Baru sesudah Drive berhasil, tulis basis data. Baris dibaca ulang di dalam transaksi
  //    supaya admin yang mengesahkan selama unggahan berjalan tidak tertimpa.
  const kunci = { periodeId_guruId_dokumenId: { periodeId, guruId, dokumenId } }
  const data = {
    fileId, namaFile, tipe: cek.tipe, ukuran: isi.length, status: 'MENUNGGU',
    diunggahPada: sekarang, alasan: null, diperiksaOleh: null, diperiksaPada: null,
  }
  const tulis = () =>
    prisma.$transaction(async (tx) => {
      const kini = await tx.dokumenGuru.findUnique({ where: kunci })
      if (kini?.status === 'SAH') return { sah: true as const, fileIdLama: null }
      const fileIdLama = kini?.fileId ?? null
      await tx.dokumenGuru.upsert({ where: kunci, create: { periodeId, guruId, dokumenId, ...data }, update: data })
      await catatRiwayat(
        { periodeId, guruId, dokumenId, aksi: fileIdLama ? 'ganti_file' : 'unggah', oleh: masukan.oleh, olehTipe: 'guru' },
        tx,
      )
      return { sah: false as const, fileIdLama }
    })
  let hasil: Awaited<ReturnType<typeof tulis>>
  try {
    try {
      hasil = await tulis()
    } catch (e) {
      // Dua unggahan pertama bersamaan: yang kalah mendapat P2002, ulangi sekali.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') hasil = await tulis()
      else throw e
    }
  } catch (e) {
    await hapusDiam(fileId)
    throw e
  }
  if (hasil.sah) {
    await hapusDiam(fileId)
    throw new GalatPengguna(PESAN_SAH)
  }

  // 6. Hapus file yang benar-benar digantikan baris baru.
  if (hasil.fileIdLama && hasil.fileIdLama !== fileId) await hapusDiam(hasil.fileIdLama)
  return { status: 'MENUNGGU' }
}
