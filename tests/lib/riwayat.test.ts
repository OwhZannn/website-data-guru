import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { catatRiwayat, daftarRiwayatDokumen, daftarRiwayatPeriode, namaPelakuRiwayat, TIDAK_DIKENAL } from '../../src/lib/riwayat'

describe('riwayat', () => {
  beforeEach(async () => { await bersihkanSemua() })

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

describe('namaPelakuRiwayat', () => {
  beforeEach(async () => { await bersihkanSemua() })

  it('memetakan nama admin dan guru, dan "(tidak dikenal)" untuk id yang hilang', async () => {
    const a = await prisma.admin.create({ data: { nama: 'Bu Admin', email: 'a@contoh.id', hashSandi: 'x' } })
    const g = await prisma.guru.create({ data: { nama: 'Pak Guru', nip: '1', email: 'g@contoh.id', hashSandi: 'x' } })
    const m = await namaPelakuRiwayat([
      { id: 'r1', oleh: a.id, olehTipe: 'admin' },
      { id: 'r2', oleh: g.id, olehTipe: 'guru' },
      { id: 'r3', oleh: 'hilang', olehTipe: 'admin' },
      { id: 'r4', oleh: a.id, olehTipe: 'guru' },
    ])
    expect(Object.fromEntries(m)).toEqual({ r1: 'Bu Admin', r2: 'Pak Guru', r3: TIDAK_DIKENAL, r4: TIDAK_DIKENAL })
  })
})
