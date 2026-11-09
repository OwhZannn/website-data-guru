import { describe, it, expect } from 'vitest'
import { paramPeriodeBaru } from '../../src/lib/pilihPeriodeUrl'

describe('paramPeriodeBaru', () => {
  it('mengganti periode, mempertahankan filter, membuang hal dan dok', () => {
    const sekarang = new URLSearchParams('periode=lama&q=ani&status=lengkap&hal=3&dok=x&per=50')
    expect(paramPeriodeBaru(sekarang, 'baru').toString()).toBe('q=ani&status=lengkap&per=50&periode=baru')
  })
  it('periode null membuang parameter periode', () => {
    expect(paramPeriodeBaru(new URLSearchParams('periode=a&q=b'), null).toString()).toBe('q=b')
  })
})
