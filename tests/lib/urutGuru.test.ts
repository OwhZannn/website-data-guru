import { describe, it, expect } from 'vitest'
import { urutkanGuru, parseUrut, type ItemUrutGuru } from '../../src/lib/urutGuru'

function buat(override: Partial<ItemUrutGuru> & { id: string; nama: string }): ItemUrutGuru {
  return {
    disetujui: true,
    asalSekolah: null,
    jumlahSah: 0,
    jumlahWajib: 0,
    aktivitasTerakhir: null,
    ...override,
  }
}

const GURU = [
  buat({ id: '1', nama: 'Zainab', disetujui: true, asalSekolah: 'SD A', jumlahSah: 3, jumlahWajib: 5, aktivitasTerakhir: 1000 }),
  buat({ id: '2', nama: 'Ahmad', disetujui: true, asalSekolah: 'SD C', jumlahSah: 5, jumlahWajib: 5, aktivitasTerakhir: 3000 }),
  buat({ id: '3', nama: 'Budi',  disetujui: false, asalSekolah: 'SD B', jumlahSah: 0, jumlahWajib: 3, aktivitasTerakhir: 2000 }),
  buat({ id: '4', nama: 'Citra', disetujui: false, asalSekolah: 'SD D', jumlahSah: 1, jumlahWajib: 4, aktivitasTerakhir: null }),
]

describe('parseUrut', () => {
  it('kolom tidak dikenal jatuh ke nama', () => {
    expect(parseUrut('invalid', 'asc')).toEqual({ kolom: 'nama', arah: 'asc' })
  })
  it('arah tidak dikenal jatuh ke asc', () => {
    expect(parseUrut('sekolah', 'balik')).toEqual({ kolom: 'sekolah', arah: 'asc' })
  })
  it('semua kolom valid diterima', () => {
    expect(parseUrut('progres', 'desc')).toEqual({ kolom: 'progres', arah: 'desc' })
    expect(parseUrut('aktivitas', 'asc')).toEqual({ kolom: 'aktivitas', arah: 'asc' })
  })
  it('tanpa argumen bawaan nama asc', () => {
    expect(parseUrut()).toEqual({ kolom: 'nama', arah: 'asc' })
  })
})

describe('urutkanGuru', () => {
  it('belum disetujui selalu muncul di atas, terlepas dari kolom urut', () => {
    const hasil = urutkanGuru(GURU, 'nama', 'asc')
    expect(hasil[0].disetujui).toBe(false)
    expect(hasil[1].disetujui).toBe(false)
    expect(hasil[2].disetujui).toBe(true)
    expect(hasil[3].disetujui).toBe(true)
  })

  it('urut nama asc: Budi sebelum Citra (dalam kelompok belum), Ahmad sebelum Zainab (kelompok disetujui)', () => {
    const hasil = urutkanGuru(GURU, 'nama', 'asc')
    expect(hasil.map(g => g.id)).toEqual(['3', '4', '2', '1'])
  })

  it('urut nama desc: Citra sebelum Budi, Zainab sebelum Ahmad', () => {
    const hasil = urutkanGuru(GURU, 'nama', 'desc')
    expect(hasil.map(g => g.id)).toEqual(['4', '3', '1', '2'])
  })

  it('urut sekolah asc', () => {
    const hasil = urutkanGuru(GURU, 'sekolah', 'asc')
    // belum: Budi (SD B) < Citra (SD D)
    expect(hasil[0].id).toBe('3')
    expect(hasil[1].id).toBe('4')
    // disetujui: Zainab (SD A) < Ahmad (SD C)
    expect(hasil[2].id).toBe('1')
    expect(hasil[3].id).toBe('2')
  })

  it('urut progres asc: rasio kecil dulu', () => {
    // Budi: 0/3=0, Citra: 1/4=0.25; Ahmad: 5/5=1, Zainab: 3/5=0.6
    const hasil = urutkanGuru(GURU, 'progres', 'asc')
    // belum: Budi (0) < Citra (0.25)
    expect(hasil[0].id).toBe('3')
    // disetujui: Zainab (0.6) < Ahmad (1)
    expect(hasil[2].id).toBe('1')
    expect(hasil[3].id).toBe('2')
  })

  it('urut progres desc: rasio besar dulu', () => {
    const hasil = urutkanGuru(GURU, 'progres', 'desc')
    // belum: Citra (0.25) > Budi (0)
    expect(hasil[0].id).toBe('4')
    // disetujui: Ahmad (1) > Zainab (0.6)
    expect(hasil[2].id).toBe('2')
    expect(hasil[3].id).toBe('1')
  })

  it('urut aktivitas asc: waktu lama dulu; null = paling lama', () => {
    // belum: Citra (null=0) < Budi (2000)
    const hasil = urutkanGuru(GURU, 'aktivitas', 'asc')
    expect(hasil[0].id).toBe('4')
    expect(hasil[1].id).toBe('3')
    // disetujui: Zainab (1000) < Ahmad (3000)
    expect(hasil[2].id).toBe('1')
    expect(hasil[3].id).toBe('2')
  })

  it('urut aktivitas desc: terbaru dulu; null = paling akhir', () => {
    // belum: Budi (2000) > Citra (null)
    const hasil = urutkanGuru(GURU, 'aktivitas', 'desc')
    expect(hasil[0].id).toBe('3')
    expect(hasil[1].id).toBe('4')
    // disetujui: Ahmad (3000) > Zainab (1000)
    expect(hasil[2].id).toBe('2')
    expect(hasil[3].id).toBe('1')
  })

  it('tidak mengubah daftar asli (murni)', () => {
    const asli = [...GURU]
    urutkanGuru(GURU, 'nama', 'desc')
    expect(GURU).toEqual(asli)
  })
})
