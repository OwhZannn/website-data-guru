import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: vi.fn(), delete: vi.fn(), get: () => ({ value: 'tok' }) }),
}))

import { catatGagalMasuk, bolehCobaMasuk, bersihkanGagalMasuk, kunciMasuk } from '../../src/lib/pembatas'
import { POST as masuk } from '../../src/app/api/auth/masuk/route'

describe('pembatas masuk', () => {
  const kunci = kunciMasuk('Guru@Contoh.id')
  beforeEach(async () => { await bersihkanGagalMasuk(kunci) })

  it('mengizinkan sebelum ada kegagalan', async () => {
    expect(await bolehCobaMasuk(kunci)).toBe(true)
  })

  it('menolak setelah lima kegagalan', async () => {
    for (let i = 0; i < 5; i++) await catatGagalMasuk(kunci)
    expect(await bolehCobaMasuk(kunci)).toBe(false)
  })

  it('kembali mengizinkan setelah dibersihkan', async () => {
    for (let i = 0; i < 5; i++) await catatGagalMasuk(kunci)
    await bersihkanGagalMasuk(kunci)
    expect(await bolehCobaMasuk(kunci)).toBe(true)
  })

  it('menyamakan email tanpa memandang besar-kecil huruf', () => {
    expect(kunciMasuk('Guru@Contoh.id')).toBe(kunciMasuk('guru@contoh.id'))
  })

  it('memulai ulang hitungan setelah jendela 15 menit lewat', async () => {
    for (let i = 0; i < 5; i++) await catatGagalMasuk(kunci)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 16 * 60_000)
    try {
      expect(await bolehCobaMasuk(kunci)).toBe(true)
      await catatGagalMasuk(kunci)
      expect(await bolehCobaMasuk(kunci)).toBe(true)
    } finally { vi.useRealTimers() }
  })

  it('route masuk mengembalikan 429 pada percobaan keenam', async () => {
    const email = 'Korban@Contoh.id'
    await bersihkanGagalMasuk(kunciMasuk(email))
    const kirim = () => masuk(new Request('http://x/api/auth/masuk', {
      method: 'POST', body: JSON.stringify({ email, sandi: 'salah' }),
    }))
    for (let i = 0; i < 5; i++) expect((await kirim()).status).toBe(401)
    const res = await kirim()
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ ok: false, pesan: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' })
    await bersihkanGagalMasuk(kunciMasuk(email))
  })
})
