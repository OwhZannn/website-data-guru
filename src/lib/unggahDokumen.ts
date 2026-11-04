import { prisma } from '@/lib/db'
import { folderGuru, unggahKeDrive, hapusDariDrive } from '@/lib/drive'
import { periksaBerkas } from '@/lib/periksaBerkas'
import { catatRiwayat } from '@/lib/riwayat'

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
  if (!periode?.dibuka) throw new Error('Masa pengunggahan sedang ditutup')
  const dokumen = await prisma.daftarDokumen.findUnique({ where: { id: dokumenId } })
  if (!dokumen || !dokumen.aktif || dokumen.periodeId !== periodeId)
    throw new Error('Dokumen tidak ditemukan atau tidak aktif')
  const guru = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!guru) throw new Error('Guru tidak ditemukan')

  // 2. Dokumen yang sudah sah tidak boleh diganti.
  const lama = await prisma.dokumenGuru.findUnique({
    where: { periodeId_guruId_dokumenId: { periodeId, guruId, dokumenId } },
  })
  if (lama?.status === 'SAH') throw new Error('Dokumen ini sudah dinyatakan sah')

  // 3. Periksa isi berkas.
  const cek = periksaBerkas({ nama: masukan.nama, tipe: masukan.tipe, isi })
  if (!cek.sah) throw new Error(cek.pesan)

  // 4. Unggah ke Drive dulu.
  const sekarang = new Date()
  const ekstensi = cek.tipe === 'application/pdf' ? 'pdf' : 'jpg'
  const namaFile = `${dokumen.nama} - ${sekarang.toISOString().slice(0, 10)}.${ekstensi}`
  const folderId = await folderGuru(guru.nip, guru.nama)
  const { fileId } = await unggahKeDrive({ folderId, namaFile, tipe: cek.tipe, isi })

  // 5. Baru sesudah Drive berhasil, tulis basis data. Simpan fileId lama sebelum ditimpa.
  const fileIdLama = lama?.fileId ?? null
  const data = {
    fileId, namaFile, tipe: cek.tipe, ukuran: isi.length, status: 'MENUNGGU',
    diunggahPada: sekarang, alasan: null, diperiksaOleh: null, diperiksaPada: null,
  }
  await prisma.$transaction(async (tx) => {
    await tx.dokumenGuru.upsert({
      where: { periodeId_guruId_dokumenId: { periodeId, guruId, dokumenId } },
      create: { periodeId, guruId, dokumenId, ...data },
      update: data,
    })
    await catatRiwayat(
      { periodeId, guruId, dokumenId, aksi: fileIdLama ? 'ganti_file' : 'unggah', oleh: masukan.oleh, olehTipe: 'guru' },
      tx,
    )
  })

  // 6. Hapus file lama; gagal di sini hanya meninggalkan file yatim.
  if (fileIdLama && fileIdLama !== fileId) {
    try {
      await hapusDariDrive(fileIdLama)
    } catch {
      // sengaja ditelan
    }
  }
  return { status: 'MENUNGGU' }
}
