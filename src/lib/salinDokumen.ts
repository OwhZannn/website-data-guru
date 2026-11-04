import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { catatRiwayat } from '@/lib/riwayat'

/** Salin dokumen aktif (urutan terjaga); nama yang sudah ada di tujuan (tanpa peduli huruf besar/kecil) dilewati. */
export async function salinDaftarDokumen(masukan: {
  dariPeriodeId: string; kePeriodeId: string; adminId: string
}): Promise<{ jumlah: number }> {
  const { dariPeriodeId, kePeriodeId, adminId } = masukan
  if (dariPeriodeId === kePeriodeId) throw new GalatPengguna('Pilih periode sumber yang berbeda')
  return prisma.$transaction(async (tx) => {
    const [dari, ke] = await Promise.all([
      tx.periode.findUnique({ where: { id: dariPeriodeId } }),
      tx.periode.findUnique({ where: { id: kePeriodeId } }),
    ])
    if (!dari || !ke) throw new GalatPengguna('Periode tidak ditemukan')
    const sumber = await tx.daftarDokumen.findMany({ where: { periodeId: dariPeriodeId, aktif: true }, orderBy: { urutan: 'asc' } })
    const tujuan = await tx.daftarDokumen.findMany({ where: { periodeId: kePeriodeId } })
    const ada = new Set(tujuan.map((d) => d.nama.toLowerCase()))
    let urutan = tujuan.reduce((m, d) => Math.max(m, d.urutan), 0)
    let jumlah = 0
    for (const d of sumber) {
      const kunci = d.nama.toLowerCase()
      if (ada.has(kunci)) continue
      ada.add(kunci)
      urutan += 1
      await tx.daftarDokumen.create({ data: { periodeId: kePeriodeId, nama: d.nama, urutan } })
      jumlah += 1
    }
    if (jumlah > 0) {
      await catatRiwayat({ periodeId: kePeriodeId, aksi: 'ubah_daftar_dokumen', alasan: `Menyalin ${jumlah} dokumen dari "${dari.nama}"`, oleh: adminId, olehTipe: 'admin' }, tx)
    }
    return { jumlah }
  })
}
