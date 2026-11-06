import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { periodeTerlihatGuru, pilihPeriode, semuaPeriode } from '../../src/lib/pilihPeriode'

async function buatGuru(nip: string) {
  return prisma.guru.create({ data: { nama: `Guru ${nip}`, username: nip, nip, email: `${nip}@contoh.id`, hashSandi: 'x' } })
}
async function buatPeriode(nama: string, dibuka: boolean, menit: number) {
  return prisma.periode.create({ data: { nama, dibuka, dibuatPada: new Date(Date.UTC(2026, 0, 1, 0, menit)) } })
}
async function isi(periodeId: string, guruId: string) {
  const d = await prisma.daftarDokumen.create({ data: { periodeId, nama: `D-${periodeId}-${guruId}`, urutan: 0 } })
  await prisma.dokumenGuru.create({ data: { periodeId, guruId, dokumenId: d.id, status: 'DITOLAK', alasan: 'buram' } })
}

describe('periodeTerlihatGuru', () => {
  beforeEach(async () => { await bersihkanSemua() })

  it('hanya periode yang berisi dokumen guru ini, ditambah yang sedang dibuka', async () => {
    const g = await buatGuru('1')
    const lain = await buatGuru('2')
    const p1 = await buatPeriode('P1', false, 1)
    const p2 = await buatPeriode('P2', false, 2)
    await buatPeriode('P3', true, 3)
    await buatPeriode('P4', false, 4)
    await isi(p1.id, g.id)
    await isi(p2.id, lain.id)
    expect((await periodeTerlihatGuru(g.id)).map((p) => p.nama)).toEqual(['P3', 'P1'])
    expect((await periodeTerlihatGuru(lain.id)).map((p) => p.nama)).toEqual(['P3', 'P2'])
  })

  it('tanpa periode dibuka: periode terbaru ikut tampil (bawaan lama)', async () => {
    const g = await buatGuru('1')
    const p1 = await buatPeriode('P1', false, 1)
    await buatPeriode('P2', false, 2)
    await isi(p1.id, g.id)
    const d = await periodeTerlihatGuru(g.id)
    expect(d.map((p) => p.nama)).toEqual(['P2', 'P1'])
    expect(pilihPeriode(d)?.nama).toBe('P2')
  })

  it('guru tanpa dokumen dan tanpa periode dibuka hanya melihat periode terbaru; tanpa periode sama sekali: kosong', async () => {
    const g = await buatGuru('1')
    expect(await periodeTerlihatGuru(g.id)).toEqual([])
    await buatPeriode('P1', false, 1)
    await buatPeriode('P2', false, 2)
    expect((await periodeTerlihatGuru(g.id)).map((p) => p.nama)).toEqual(['P2'])
  })
})

describe('pilihPeriode', () => {
  const daftar = [
    { id: 'c', dibuka: false },
    { id: 'b', dibuka: true },
    { id: 'a', dibuka: false },
  ]
  it('bawaan: yang dibuka, lalu yang pertama (terbaru)', () => {
    expect(pilihPeriode(daftar)?.id).toBe('b')
    expect(pilihPeriode([daftar[0], daftar[2]])?.id).toBe('c')
    expect(pilihPeriode([])).toBeNull()
  })
  it('id yang diminta dipakai bila ada di daftar; id asing atau tidak sah jatuh ke bawaan', () => {
    expect(pilihPeriode(daftar, 'a')?.id).toBe('a')
    expect(pilihPeriode(daftar, 'milik-orang-lain')?.id).toBe('b')
    expect(pilihPeriode(daftar, '')?.id).toBe('b')
  })
  it('semuaPeriode mengurutkan terbaru dulu', async () => {
    await bersihkanSemua()
    await buatPeriode('Lama', false, 1)
    await buatPeriode('Baru', false, 2)
    expect((await semuaPeriode()).map((p) => p.nama)).toEqual(['Baru', 'Lama'])
  })
})
