import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { buatSesi, bacaSesi, hapusSesi } from '../../src/lib/sesi'

describe('sesi', () => {
  beforeEach(async () => { await prisma.sesi.deleteMany() })

  it('mengembalikan pemilik dan tipe untuk token yang sah', async () => {
    const token = await buatSesi('guru-1', 'guru')
    expect(await bacaSesi(token)).toEqual({ pemilikId: 'guru-1', tipe: 'guru' })
  })

  it('menolak token yang tidak dikenal', async () => {
    expect(await bacaSesi('token-palsu')).toBeNull()
  })

  it('menolak token yang sudah dihapus', async () => {
    const token = await buatSesi('guru-1', 'guru')
    await hapusSesi(token)
    expect(await bacaSesi(token)).toBeNull()
  })

  it('menolak token yang sudah kedaluwarsa', async () => {
    const token = await buatSesi('guru-1', 'guru')
    await prisma.sesi.update({ where: { token }, data: { kedaluwarsa: new Date(Date.now() - 1000) } })
    expect(await bacaSesi(token)).toBeNull()
  })
})
