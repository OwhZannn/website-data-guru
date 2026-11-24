import { describe, it, expect } from 'vitest'
import { ipKlien } from '../../src/lib/ipKlien'

describe('ipKlien', () => {
  it('memakai entri terakhir X-Forwarded-For dan mengabaikan X-Real-IP kiriman klien', () => {
    const h = new Headers({ 'x-forwarded-for': '9.9.9.9, 10.0.0.1', 'x-real-ip': '1.1.1.1' })
    expect(ipKlien(h)).toBe('10.0.0.1')
  })

  it('X-Real-IP palsu yang berganti-ganti tidak mengubah hasil', () => {
    const a = ipKlien(new Headers({ 'x-forwarded-for': '10.0.0.1', 'x-real-ip': 'acak-1' }))
    const b = ipKlien(new Headers({ 'x-forwarded-for': '10.0.0.1', 'x-real-ip': 'acak-2' }))
    expect(a).toBe(b)
  })

  it('jatuh ke X-Real-IP bila X-Forwarded-For tidak ada, lalu ke tanpa-ip', () => {
    expect(ipKlien(new Headers({ 'x-real-ip': '10.0.0.5' }))).toBe('10.0.0.5')
    expect(ipKlien(new Headers())).toBe('tanpa-ip')
  })
})
