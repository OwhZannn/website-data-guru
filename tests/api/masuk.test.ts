import { describe, it, expect, beforeEach, vi } from 'vitest'

const set = vi.fn()
const del = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({ set, delete: del, get: () => ({ value: 'tok' }) }),
}))
vi.mock('@/lib/sandi', async (asli) => {
  const mod = await asli<typeof import('../../src/lib/sandi')>()
  return { ...mod, periksaSandi: vi.fn(mod.periksaSandi) }
})

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { hashSandi, periksaSandi } from '../../src/lib/sandi'
import { POST as masuk } from '../../src/app/api/auth/masuk/route'
import { POST as keluar } from '../../src/app/api/auth/keluar/route'

const req = (email: string, sandi: string) =>
  new Request('http://x/api/auth/masuk', { method: 'POST', body: JSON.stringify({ email, sandi }) })

describe('masuk', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await bersihkanSemua()
    await prisma.admin.create({
      data: { nama: 'A', email: 'admin@x.com', hashSandi: await hashSandi('benar') },
    })
    await prisma.guru.create({
      data: { nama: 'G', nip: '1', email: 'guru@x.com', hashSandi: await hashSandi('benar'), aktif: false },
    })
  })

  it('tetap memeriksa sandi untuk email tidak dikenal', async () => {
    const res = await masuk(req('tidak@ada.com', 'apa-saja'))
    expect(res.status).toBe(401)
    expect(periksaSandi).toHaveBeenCalledTimes(1)
  })

  it('tetap memeriksa sandi untuk akun nonaktif dan menolaknya', async () => {
    const res = await masuk(req('guru@x.com', 'benar'))
    expect(res.status).toBe(401)
    expect(periksaSandi).toHaveBeenCalledTimes(1)
  })

  it('mencocokkan email tanpa peduli huruf besar dan spasi', async () => {
    const res = await masuk(req('  Admin@X.com ', 'benar'))
    expect(res.status).toBe(200)
    expect(set).toHaveBeenCalled()
  })

  it('keluar menghapus cookie dengan path /', async () => {
    await keluar()
    expect(del).toHaveBeenCalledWith({ name: 'sesi', path: '/' })
  })
})
