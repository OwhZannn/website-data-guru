import { describe, it, expect, beforeEach, vi } from 'vitest'

let tokenSekarang = 'tok-sekarang'
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' ? { value: tokenSekarang } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { hashSandi, periksaSandi } from '../../src/lib/sandi'
import { buatSesi } from '../../src/lib/sesi'
import { POST } from '../../src/app/api/ganti-sandi/route'

const req = (b: unknown) => new Request('http://x/api/ganti-sandi', { method: 'POST', body: JSON.stringify(b) })

describe('ganti sandi', () => {
  let guruId: string
  beforeEach(async () => {
    await prisma.sesi.deleteMany()
    await prisma.guru.deleteMany()
    const g = await prisma.guru.create({
      data: { nama: 'G', nip: '1', email: 'g@x.com', hashSandi: await hashSandi('lama-12345') },
    })
    guruId = g.id
    tokenSekarang = await buatSesi(g.id, 'guru')
  })

  it('401 tanpa sesi', async () => {
    tokenSekarang = 'tidak-ada'
    expect((await POST(req({}))).status).toBe(401)
  })

  it('menolak sandi lama salah', async () => {
    const r = await POST(req({ sandiLama: 'salah', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Kata sandi lama salah')
  })

  it('menolak sandi baru pendek', async () => {
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'pendek', konfirmasi: 'pendek' }))
    expect((await r.json()).pesan).toBe('Kata sandi baru minimal 8 karakter')
  })

  it('menolak konfirmasi tidak cocok', async () => {
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'beda-12345' }))
    expect((await r.json()).pesan).toBe('Konfirmasi kata sandi tidak cocok')
  })

  it('berhasil: sandi berubah, sesi lain dihapus, sesi sekarang tetap', async () => {
    const lain = await buatSesi(guruId, 'guru')
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(200)
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(await periksaSandi('baru-12345', g.hashSandi)).toBe(true)
    expect(await prisma.sesi.findUnique({ where: { token: lain } })).toBeNull()
    expect(await prisma.sesi.findUnique({ where: { token: tokenSekarang } })).not.toBeNull()
  })
})
