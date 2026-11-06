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

const req = (username: string, sandi: string) =>
  new Request('http://x/api/auth/masuk', { method: 'POST', body: JSON.stringify({ username, sandi }) })

const NIP = '198701012010012001'
const NIK = '5201014507900001'

describe('masuk', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await bersihkanSemua()
    const h = await hashSandi('benar')
    await prisma.admin.create({ data: { nama: 'A', email: 'admin@x.com', hashSandi: h } })
    await prisma.guru.create({ data: { nama: 'Nonaktif', username: '1', nip: '1', email: 'guru@x.com', hashSandi: h, aktif: false } })
    await prisma.guru.create({ data: { nama: 'PNS', username: NIP, nip: NIP, hashSandi: h } })
    await prisma.guru.create({ data: { nama: 'Non ASN', username: NIK, nik: NIK, hashSandi: h, disetujui: false } })
  })

  it('tetap memeriksa sandi untuk username tidak dikenal', async () => {
    const res = await masuk(req('999', 'apa-saja'))
    expect(res.status).toBe(401)
    expect(periksaSandi).toHaveBeenCalledTimes(1)
  })

  it('tetap memeriksa sandi untuk akun nonaktif dan menolaknya', async () => {
    const res = await masuk(req('1', 'benar'))
    expect(res.status).toBe(401)
    expect(periksaSandi).toHaveBeenCalledTimes(1)
  })

  it('admin masuk dengan email tanpa peduli huruf besar dan spasi', async () => {
    const res = await masuk(req('  Admin@X.com ', 'benar'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, tipe: 'admin' })
    expect(set).toHaveBeenCalled()
  })

  it('guru masuk dengan NIP; spasi dan titik diabaikan', async () => {
    const res = await masuk(req('19870101 201001 2 001', 'benar'))
    expect(await res.json()).toMatchObject({ ok: true, tipe: 'guru' })
  })

  it('guru tidak bisa lagi masuk dengan email', async () => {
    await prisma.guru.update({ where: { username: '1' }, data: { aktif: true } })
    expect((await masuk(req('guru@x.com', 'benar'))).status).toBe(401)
  })

  it('pendaftaran yang belum disetujui: diberi tahu hanya bila sandinya benar, tanpa sesi', async () => {
    const salah = await masuk(req(NIK, 'salah'))
    expect(salah.status).toBe(401)
    const benar = await masuk(req(NIK, 'benar'))
    expect(benar.status).toBe(403)
    expect((await benar.json()).pesan).toContain('menunggu persetujuan admin')
    expect(set).not.toHaveBeenCalled()
    expect(await prisma.sesi.count()).toBe(0)
  })

  it('keluar menghapus cookie dengan path /', async () => {
    await keluar()
    expect(del).toHaveBeenCalledWith({ name: 'sesi', path: '/' })
  })
})
