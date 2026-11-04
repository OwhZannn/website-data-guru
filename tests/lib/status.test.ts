import { describe, it, expect } from 'vitest'
import { hitungStatusGuru } from '../../src/lib/status'

const daftar = [1, 2, 3, 4, 5].map(i => ({ id: `d${i}`, aktif: true }))
const satu = (dokumenId: string, status: string) => ({ dokumenId, status })

describe('hitungStatusGuru', () => {
  it('menghitung nol dari lima saat belum ada unggahan', () => {
    const h = hitungStatusGuru(daftar, [])
    expect(h).toMatchObject({ lengkap: false, jumlahSah: 0, jumlahWajib: 5, label: 'Belum mulai' })
  })

  it('menandai ada yang ditolak walau sebagian sudah sah', () => {
    const h = hitungStatusGuru(daftar, [satu('d1', 'SAH'), satu('d2', 'DITOLAK')])
    expect(h).toMatchObject({ lengkap: false, jumlahSah: 1, adaDitolak: true, label: 'Ada yang ditolak' })
  })

  it('menandai perlu dicek saat ada yang menunggu', () => {
    const h = hitungStatusGuru(daftar, [satu('d1', 'SAH'), satu('d2', 'MENUNGGU')])
    expect(h).toMatchObject({ adaDitolak: false, label: 'Perlu dicek' })
  })

  it('menyatakan lengkap hanya bila kelimanya sah', () => {
    const semua = daftar.map(d => satu(d.id, 'SAH'))
    expect(hitungStatusGuru(daftar, semua)).toMatchObject({ lengkap: true, jumlahSah: 5, label: 'Lengkap' })
  })

  it('mengabaikan dokumen yang sudah dinonaktifkan', () => {
    const denganNonaktif = [...daftar, { id: 'd9', aktif: false }]
    const h = hitungStatusGuru(denganNonaktif, daftar.map(d => satu(d.id, 'SAH')))
    expect(h).toMatchObject({ lengkap: true, jumlahWajib: 5 })
  })

  it('tidak lengkap bila dokumen aktif belum ada barisnya sama sekali', () => {
    const h = hitungStatusGuru(daftar, [satu('d1', 'SAH')])
    expect(h).toMatchObject({ lengkap: false, jumlahSah: 1, jumlahWajib: 5 })
  })

  it('mengabaikan baris guru untuk dokumen yang tidak aktif', () => {
    const h = hitungStatusGuru(daftar, [satu('d9', 'SAH'), satu('d8', 'DITOLAK')])
    expect(h).toMatchObject({ jumlahSah: 0, adaDitolak: false, label: 'Belum mulai' })
  })
})
