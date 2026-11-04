import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { catatRiwayat, daftarRiwayatDokumen, daftarRiwayatPeriode } from '../../src/lib/riwayat'

describe('riwayat', () => {
  beforeEach(async () => { await prisma.riwayat.deleteMany() })

  it('mencatat alasan penolakan', async () => {
    await catatRiwayat({ periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', aksi: 'tolak', alasan: 'Scan buram', oleh: 'a1', olehTipe: 'admin' })
    const r = await daftarRiwayatDokumen('g1', 'd1')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ aksi: 'tolak', alasan: 'Scan buram', olehTipe: 'admin' })
  })

  it('mengembalikan riwayat terbaru lebih dulu', async () => {
    await catatRiwayat({ periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', aksi: 'unggah', oleh: 'g1', olehTipe: 'guru' })
    await catatRiwayat({ periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', aksi: 'sahkan', oleh: 'a1', olehTipe: 'admin' })
    const r = await daftarRiwayatDokumen('g1', 'd1')
    expect(r.map(x => x.aksi)).toEqual(['sahkan', 'unggah'])
  })

  it('urutan deterministik saat waktu sama (id sebagai pembeda)', async () => {
    const waktu = new Date('2026-01-01T00:00:00Z')
    const dasar = { waktu, periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', oleh: 'a1', olehTipe: 'admin' }
    await prisma.riwayat.createMany({ data: [
      { ...dasar, id: 'a', aksi: 'unggah' }, { ...dasar, id: 'c', aksi: 'tolak' }, { ...dasar, id: 'b', aksi: 'sahkan' },
    ] })
    const r = await daftarRiwayatDokumen('g1', 'd1')
    expect(r.map(x => x.id)).toEqual(['c', 'b', 'a'])
  })

  it('menerima klien transaksi dan membatasi per halaman', async () => {
    await prisma.$transaction(async tx => {
      for (let i = 0; i < 3; i++) {
        await catatRiwayat({ periodeId: 'p1', aksi: 'buka_periode', oleh: 'a1', olehTipe: 'admin' }, tx)
      }
    })
    expect(await daftarRiwayatPeriode('p1')).toHaveLength(3)
    expect(await daftarRiwayatPeriode('p1', { batas: 2, halaman: 0 })).toHaveLength(2)
    expect(await daftarRiwayatPeriode('p1', { batas: 2, halaman: 1 })).toHaveLength(1)
  })
})
