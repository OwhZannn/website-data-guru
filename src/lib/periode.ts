import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { catatRiwayat } from '@/lib/riwayat'

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
