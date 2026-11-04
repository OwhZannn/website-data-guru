import { describe, it, expect } from 'vitest'
import { hashSandi, periksaSandi } from '../../src/lib/sandi'

describe('sandi', () => {
  it('tidak menyimpan sandi apa adanya', async () => {
    const hash = await hashSandi('rahasia123')
    expect(hash).not.toContain('rahasia123')
  })

  it('menerima sandi yang benar', async () => {
    const hash = await hashSandi('rahasia123')
    expect(await periksaSandi('rahasia123', hash)).toBe(true)
  })

  it('menolak sandi yang salah', async () => {
    const hash = await hashSandi('rahasia123')
    expect(await periksaSandi('rahasia124', hash)).toBe(false)
  })
})
