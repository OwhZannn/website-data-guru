import { describe, it, expect } from 'vitest'
import { cocokTeks, normalisasiOpsi, normalisasiTeks } from '../../src/lib/combobox'

describe('Combobox utility functions', () => {
  it('normalisasiTeks mengubah ke huruf kecil dan membuang aksen/diakritik', () => {
    expect(normalisasiTeks('MAN 2 Mataram')).toBe('man 2 mataram')
    expect(normalisasiTeks('Café Résumé')).toBe('cafe resume')
    expect(normalisasiTeks('   Spasi Berlebih   ')).toBe('spasi berlebih')
  })

  it('cocokTeks mencocokkan tanpa peka huruf besar-kecil dan aksen', () => {
    expect(cocokTeks('MAN 2 Mataram', 'man 2')).toBe(true)
    expect(cocokTeks('MAN 2 Mataram', 'MATARAM')).toBe(true)
    expect(cocokTeks('MTsN 1 Lombok', 'mtsn')).toBe(true)
    expect(cocokTeks('SD Negeri 5', 'smp')).toBe(false)
    expect(cocokTeks('SMA Negeri 1', '')).toBe(true)
  })

  it('normalisasiOpsi menangani string, tuple, dan objek opsi', () => {
    const hasil = normalisasiOpsi([
      'MAN 1',
      ['PNS', 'Pegawai Negeri Sipil'],
      { nilai: 'KEPSEK', label: 'Kepala Sekolah', nonaktif: true },
    ])
    expect(hasil).toEqual([
      { nilai: 'MAN 1', label: 'MAN 1' },
      { nilai: 'PNS', label: 'Pegawai Negeri Sipil' },
      { nilai: 'KEPSEK', label: 'Kepala Sekolah', nonaktif: true },
    ])
  })
})
