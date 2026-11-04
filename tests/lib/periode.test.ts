import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatPeriode, bukaPeriode, tutupPeriode } from '../../src/lib/periode'
import { salinDaftarDokumen } from '../../src/lib/salinDokumen'

describe('periode', () => {
  let adminId: string
  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
  })

  it('membuat periode dengan nama dipangkas dan memvalidasi', async () => {
    const { id } = await buatPeriode({ nama: '  Semester 1 ', adminId })
    expect((await prisma.periode.findUniqueOrThrow({ where: { id } })).nama).toBe('Semester 1')
    await expect(buatPeriode({ nama: '   ', adminId })).rejects.toThrow('Nama periode wajib diisi')
    await expect(buatPeriode({ nama: 'x'.repeat(101), adminId })).rejects.toThrow('Nama periode maksimal 100 karakter')
  })

  it('membuka periode menutup periode terbuka lain dan mencatat riwayat', async () => {
    const a = await buatPeriode({ nama: 'A', adminId })
    const b = await buatPeriode({ nama: 'B', adminId })
    await bukaPeriode({ periodeId: a.id, adminId })
    await bukaPeriode({ periodeId: b.id, adminId })
    expect(await prisma.periode.findMany({ where: { dibuka: true } })).toMatchObject([{ id: b.id }])
    const r = await prisma.riwayat.findMany({ where: { periodeId: a.id }, orderBy: { waktu: 'asc' } })
    expect(r.map((x) => x.aksi).sort()).toEqual(['buka_periode', 'tutup_periode'])
    await tutupPeriode({ periodeId: b.id, adminId })
    expect(await prisma.periode.count({ where: { dibuka: true } })).toBe(0)
  })

  it('menyalin hanya dokumen aktif, urut, tanpa nama ganda', async () => {
    const a = await buatPeriode({ nama: 'A', adminId })
    const b = await buatPeriode({ nama: 'B', adminId })
    await prisma.daftarDokumen.createMany({ data: [
      { periodeId: a.id, nama: 'SK', urutan: 1 },
      { periodeId: a.id, nama: 'Ijazah', urutan: 2 },
      { periodeId: a.id, nama: 'Lama', urutan: 3, aktif: false },
      { periodeId: a.id, nama: 'KTP', urutan: 4 },
      { periodeId: b.id, nama: 'sk', urutan: 1 },
    ] })
    const h = await salinDaftarDokumen({ dariPeriodeId: a.id, kePeriodeId: b.id, adminId })
    expect(h.jumlah).toBe(2)
    const d = await prisma.daftarDokumen.findMany({ where: { periodeId: b.id }, orderBy: { urutan: 'asc' } })
    expect(d.map((x) => x.nama)).toEqual(['sk', 'Ijazah', 'KTP'])
  })
})
