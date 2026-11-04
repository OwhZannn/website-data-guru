import { describe, it, expect } from 'vitest'
import { amanUntukNamaFolder } from '../../src/lib/namaAman'

describe('amanUntukNamaFolder', () => {
  it('membiarkan nama biasa apa adanya', () => {
    expect(amanUntukNamaFolder('Siti Rahmawati')).toBe('Siti Rahmawati')
  })
  it('mengganti garis miring yang akan memecah folder', () => {
    expect(amanUntukNamaFolder('Dewi / Lestari')).toBe('Dewi - Lestari')
  })
  it('mengganti seluruh karakter terlarang Drive', () => {
    expect(amanUntukNamaFolder('a\\b:c*d?e"f<g>h|i')).not.toMatch(/[\\/:*?"<>|]/)
  })
  it('memotong nama yang sangat panjang', () => {
    expect(amanUntukNamaFolder('x'.repeat(500)).length).toBeLessThanOrEqual(100)
  })
  it('tidak mengembalikan nama kosong untuk masukan aneh', () => {
    expect(amanUntukNamaFolder('   ').length).toBeGreaterThan(0)
    expect(amanUntukNamaFolder('///').length).toBeGreaterThan(0)
  })
})
