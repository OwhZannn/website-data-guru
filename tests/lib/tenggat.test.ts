import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { lewatTenggat, sisaWaktu, tanggalDariTenggat, tenggatDariTanggal, teksTenggat, tutupPeriodeLewatTenggat } from '../../src/lib/tenggat'
import { aturTenggat, bukaPeriode } from '../../src/lib/periode'
import { namaPelakuRiwayat } from '../../src/lib/riwayat'

const JAM = 3_600_000

describe('konversi tenggat (WITA)', () => {
  it('hari terakhir 30 Nov berarti tertutup pukul 00.00 WITA 1 Des (= 16.00 UTC 30 Nov)', () => {
    const t = tenggatDariTanggal('2026-11-30')
    expect(t.toISOString()).toBe('2026-11-30T16:00:00.000Z')
    expect(tanggalDariTenggat(t)).toBe('2026-11-30')
    expect(teksTenggat(t)).toBe('Senin, 30 November 2026')
  })

  it('menolak tanggal yang tidak valid', () => {
    expect(() => tenggatDariTanggal('2026-02-30')).toThrow()
    expect(() => tenggatDariTanggal('30/11/2026')).toThrow()
  })

  it('lewatTenggat dan sisaWaktu', () => {
    const t = new Date('2026-12-01T00:00:00Z')
    expect(lewatTenggat(null)).toBe(false)
    expect(lewatTenggat(t, new Date(t.getTime() - 1))).toBe(false)
    expect(lewatTenggat(t, t)).toBe(true)
    expect(sisaWaktu(t, new Date(t.getTime() - 30 * 60_000))).toEqual({ teks: 'kurang dari 1 jam lagi', mendesak: true })
    expect(sisaWaktu(t, new Date(t.getTime() - 5 * JAM))).toEqual({ teks: '5 jam lagi', mendesak: true })
    expect(sisaWaktu(t, new Date(t.getTime() - 50 * JAM))).toEqual({ teks: '3 hari lagi', mendesak: true })
    expect(sisaWaktu(t, new Date(t.getTime() - 10 * 24 * JAM))).toEqual({ teks: '10 hari lagi', mendesak: false })
  })
})

describe('tenggat periode', () => {
  let adminId: string
  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
  })

  it('menutup otomatis periode lewat tenggat sekali saja, tercatat oleh Sistem', async () => {
    const p = await prisma.periode.create({ data: { nama: 'P', dibuka: true, tenggat: new Date(Date.now() - 1000) } })
    const lain = await prisma.periode.create({ data: { nama: 'Q', dibuka: false, tenggat: new Date(Date.now() - 1000) } })
    await Promise.all([tutupPeriodeLewatTenggat(), tutupPeriodeLewatTenggat()])
    expect((await prisma.periode.findUniqueOrThrow({ where: { id: p.id } })).dibuka).toBe(false)
    const r = await prisma.riwayat.findMany({ where: { aksi: 'tutup_periode' } })
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ periodeId: p.id, alasan: 'Ditutup otomatis karena tenggat terlewati' })
    expect((await namaPelakuRiwayat(r)).get(r[0].id)).toBe('Sistem')
    expect(await prisma.riwayat.count({ where: { periodeId: lain.id } })).toBe(0)
  })

  it('tidak menutup periode yang tenggatnya belum lewat', async () => {
    const p = await prisma.periode.create({ data: { nama: 'P', dibuka: true, tenggat: new Date(Date.now() + JAM) } })
    await tutupPeriodeLewatTenggat()
    expect((await prisma.periode.findUniqueOrThrow({ where: { id: p.id } })).dibuka).toBe(true)
  })

  it('aturTenggat menyimpan, mencatat, menghapus, dan menolak tanggal lampau saat dibuka', async () => {
    const p = await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
    await aturTenggat({ periodeId: p.id, tanggal: '2099-01-31', adminId })
    expect((await prisma.periode.findUniqueOrThrow({ where: { id: p.id } })).tenggat?.toISOString()).toBe('2099-01-31T16:00:00.000Z')
    await aturTenggat({ periodeId: p.id, tanggal: '2099-01-31', adminId }) // tidak berubah: tanpa riwayat baru
    await aturTenggat({ periodeId: p.id, tanggal: null, adminId })
    expect((await prisma.periode.findUniqueOrThrow({ where: { id: p.id } })).tenggat).toBeNull()
    const r = await prisma.riwayat.findMany({ where: { aksi: 'ubah_tenggat' }, orderBy: { waktu: 'asc' } })
    expect(r.map((x) => x.alasan)).toEqual(['tanpa tenggat → 2099-01-31', '2099-01-31 → tanpa tenggat'])
    await expect(aturTenggat({ periodeId: p.id, tanggal: '2020-01-01', adminId })).rejects.toThrow('Tenggat tidak boleh sebelum hari ini')
    await expect(aturTenggat({ periodeId: p.id, tanggal: 'bukan', adminId })).rejects.toThrow('Tanggal tenggat tidak valid')
  })

  it('periode yang tenggatnya lewat tidak bisa dibuka sebelum tenggat diubah', async () => {
    const p = await prisma.periode.create({ data: { nama: 'P', dibuka: false, tenggat: new Date(Date.now() - 1000) } })
    await expect(bukaPeriode({ periodeId: p.id, adminId })).rejects.toThrow('Tenggat periode ini sudah lewat')
    await aturTenggat({ periodeId: p.id, tanggal: '2099-01-31', adminId })
    await bukaPeriode({ periodeId: p.id, adminId })
    expect((await prisma.periode.findUniqueOrThrow({ where: { id: p.id } })).dibuka).toBe(true)
  })
})
