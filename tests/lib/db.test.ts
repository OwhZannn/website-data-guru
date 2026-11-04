import { describe, it, expect } from 'vitest'
import { prisma } from '../../src/lib/db'

describe('instance prisma', () => {
  it('sama setiap kali diimpor', async () => {
    const { prisma: lagi } = await import('../../src/lib/db')
    expect(lagi).toBe(prisma)
  })

  it('bisa membaca model Periode', async () => {
    const jumlah = await prisma.periode.count()
    expect(typeof jumlah).toBe('number')
  })
})
