import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { catatRiwayat } from '@/lib/riwayat'
import { lewatTenggat, tanggalDariTenggat, tenggatDariTanggal } from '@/lib/tenggat'

export async function buatPeriode(masukan: { nama: string; adminId: string }): Promise<{ id: string }> {
  const nama = masukan.nama.trim()
  if (!nama) throw new GalatPengguna('Nama periode wajib diisi')
  if (nama.length > 100) throw new GalatPengguna('Nama periode maksimal 100 karakter')
  const p = await prisma.periode.create({ data: { nama, dibuka: false } })
  return { id: p.id }
}

/** Hanya satu periode boleh terbuka: periode terbuka lain ditutup dalam transaksi yang sama. */
export async function bukaPeriode(masukan: { periodeId: string; adminId: string }): Promise<void> {
  const { periodeId, adminId } = masukan
  await prisma.$transaction(async (tx) => {
    const p = await tx.periode.findUnique({ where: { id: periodeId } })
    if (!p) throw new GalatPengguna('Periode tidak ditemukan')
    const lain = await tx.periode.findMany({ where: { dibuka: true, id: { not: periodeId } } })
    for (const l of lain) {
      await tx.periode.update({ where: { id: l.id }, data: { dibuka: false } })
      await catatRiwayat({ periodeId: l.id, aksi: 'tutup_periode', alasan: `Ditutup karena periode "${p.nama}" dibuka`, oleh: adminId, olehTipe: 'admin' }, tx)
    }
    if (!p.dibuka) {
      if (lewatTenggat(p.tenggat)) throw new GalatPengguna('Tenggat periode ini sudah lewat. Ubah atau hapus tenggatnya dulu.')
      await tx.periode.update({ where: { id: periodeId }, data: { dibuka: true } })
      await catatRiwayat({ periodeId, aksi: 'buka_periode', oleh: adminId, olehTipe: 'admin' }, tx)
    }
  })
}

export async function tutupPeriode(masukan: { periodeId: string; adminId: string }): Promise<void> {
  const { periodeId, adminId } = masukan
  await prisma.$transaction(async (tx) => {
    const p = await tx.periode.findUnique({ where: { id: periodeId } })
    if (!p) throw new GalatPengguna('Periode tidak ditemukan')
    if (!p.dibuka) return
    await tx.periode.update({ where: { id: periodeId }, data: { dibuka: false } })
    await catatRiwayat({ periodeId, aksi: 'tutup_periode', oleh: adminId, olehTipe: 'admin' }, tx)
  })
}

/**
 * Atur hari terakhir unggah ("YYYY-MM-DD", WITA) atau hapus tenggat (null). Tanggal yang sudah lewat
 * ditolak untuk periode yang sedang dibuka supaya periode tidak tertutup tanpa sengaja.
 */
export async function aturTenggat(masukan: { periodeId: string; tanggal: string | null; adminId: string }): Promise<void> {
  const { periodeId, tanggal, adminId } = masukan
  let tenggat: Date | null = null
  if (tanggal) {
    try {
      tenggat = tenggatDariTanggal(tanggal)
    } catch {
      throw new GalatPengguna('Tanggal tenggat tidak valid')
    }
  }
  await prisma.$transaction(async (tx) => {
    const p = await tx.periode.findUnique({ where: { id: periodeId } })
    if (!p) throw new GalatPengguna('Periode tidak ditemukan')
    if (tenggat && p.dibuka && lewatTenggat(tenggat)) throw new GalatPengguna('Tenggat tidak boleh sebelum hari ini selama periode dibuka')
    if ((p.tenggat?.getTime() ?? null) === (tenggat?.getTime() ?? null)) return
    await tx.periode.update({ where: { id: periodeId }, data: { tenggat } })
    const dari = p.tenggat ? tanggalDariTenggat(p.tenggat) : 'tanpa tenggat'
    const ke = tenggat ? tanggalDariTenggat(tenggat) : 'tanpa tenggat'
    await catatRiwayat({ periodeId, aksi: 'ubah_tenggat', alasan: `${dari} → ${ke}`, oleh: adminId, olehTipe: 'admin' }, tx)
  })
}
