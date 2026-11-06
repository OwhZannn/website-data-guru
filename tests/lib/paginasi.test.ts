import { describe, it, expect } from 'vitest'
import { potongHalaman, nomorHalaman } from '../../src/lib/paginasi'

const daftar = Array.from({ length: 305 }, (_, i) => i + 1)

describe('potongHalaman', () => {
  it('bawaan 20 per halaman, halaman 1', () => {
    const h = potongHalaman(daftar)
    expect(h).toMatchObject({ hal: 1, per: 20, jumlahHal: 16, total: 305, dari: 1, sampai: 20 })
    expect(h.isi).toEqual(daftar.slice(0, 20))
  })

  it('menerima 50 dan 100; halaman terakhir berisi sisa', () => {
    expect(potongHalaman(daftar, '7', '50')).toMatchObject({ hal: 7, per: 50, jumlahHal: 7, dari: 301, sampai: 305 })
    expect(potongHalaman(daftar, '2', '100').isi[0]).toBe(101)
  })

  it('per di luar pilihan jatuh ke 20; halaman aneh dijepit', () => {
    expect(potongHalaman(daftar, '1', '1000').per).toBe(20)
    expect(potongHalaman(daftar, '0').hal).toBe(1)
    expect(potongHalaman(daftar, 'abc').hal).toBe(1)
    expect(potongHalaman(daftar, '999').hal).toBe(16)
    expect(potongHalaman(daftar, '2.7').hal).toBe(2)
  })

  it('daftar kosong tetap satu halaman', () => {
    expect(potongHalaman([], '3')).toMatchObject({ hal: 1, jumlahHal: 1, dari: 0, sampai: 0, isi: [] })
  })
})

describe('nomorHalaman', () => {
  it('menampilkan ujung dan tetangga, celah jadi null', () => {
    expect(nomorHalaman(1, 16)).toEqual([1, 2, null, 16])
    expect(nomorHalaman(8, 16)).toEqual([1, null, 7, 8, 9, null, 16])
    expect(nomorHalaman(16, 16)).toEqual([1, null, 15, 16])
    expect(nomorHalaman(1, 1)).toEqual([1])
    expect(nomorHalaman(2, 3)).toEqual([1, 2, 3])
  })
})
