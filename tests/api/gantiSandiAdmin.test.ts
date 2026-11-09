import { describe, it, expect, beforeEach, vi } from 'vitest'

let tokenSekarang = 'tok-sekarang'
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' ? { value: tokenSekarang } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { hashSandi, periksaSandi } from '../../src/lib/sandi'
import { buatSesi } from '../../src/lib/sesi'
import { POST } from '../../src/app/api/admin/ganti-sandi/route'
import { POST as POST_GURU } from '../../src/app/api/ganti-sandi/route'

const req = (b: unknown) => new Request('http://x/api/admin/ganti-sandi', { method: 'POST', body: JSON.stringify(b) })

describe('ganti sandi admin', () => {
  let adminId: string
  beforeEach(async () => {
    await bersihkanSemua()
    const a = await prisma.admin.create({
      data: { nama: 'A', email: 'a@x.com', hashSandi: await hashSandi('lama-12345') },
    })
    adminId = a.id
    tokenSekarang = await buatSesi(a.id, 'admin')
  })

  it('401 tanpa sesi', async () => {
    tokenSekarang = 'tidak-ada'
    expect((await POST(req({}))).status).toBe(401)
  })

  it('401 untuk sesi guru', async () => {
    const g = await prisma.guru.create({
      data: { nama: 'G', username: '1', nip: '1', email: 'g@x.com', hashSandi: await hashSandi('lama-12345') },
    })
    tokenSekarang = await buatSesi(g.id, 'guru')
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(401)
    expect(await periksaSandi('lama-12345', (await prisma.guru.findUniqueOrThrow({ where: { id: g.id } })).hashSandi)).toBe(true)
  })

  it('endpoint guru menolak sesi admin dengan 401', async () => {
    const r = await POST_GURU(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(401)
    expect(await periksaSandi('lama-12345', (await prisma.admin.findUniqueOrThrow({ where: { id: adminId } })).hashSandi)).toBe(true)
  })

  it('menolak permintaan tidak sah', async () => {
    const r = await POST(req({ sandiLama: 'x' }))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Permintaan tidak sah')
  })

  it('menolak sandi lama salah', async () => {
    const r = await POST(req({ sandiLama: 'salah', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Kata sandi lama salah')
  })

  it('menolak sandi baru pendek', async () => {
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'pendek', konfirmasi: 'pendek' }))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Kata sandi baru minimal 8 karakter')
  })

  it('menolak konfirmasi tidak cocok', async () => {
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'beda-12345' }))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Konfirmasi kata sandi tidak cocok')
  })

  it('berhasil: sandi berubah, sesi admin lain dihapus, sesi sekarang dan sesi guru tetap', async () => {
    const lain = await buatSesi(adminId, 'admin')
    const g = await prisma.guru.create({
      data: { nama: 'G', username: '1', nip: '1', email: 'g@x.com', hashSandi: await hashSandi('x-12345678') },
    })
    const sesiGuru = await buatSesi(g.id, 'guru')
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true })
    const a = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } })
    expect(await periksaSandi('baru-12345', a.hashSandi)).toBe(true)
    expect(await periksaSandi('lama-12345', a.hashSandi)).toBe(false)
    expect(await prisma.sesi.findUnique({ where: { token: lain } })).toBeNull()
    expect(await prisma.sesi.findUnique({ where: { token: tokenSekarang } })).not.toBeNull()
    expect(await prisma.sesi.findUnique({ where: { token: sesiGuru } })).not.toBeNull()
  })

  it('429 setelah 5 kali sandi lama salah, lalu sandi benar pun ditolak sementara', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await POST(req({ sandiLama: 'salah', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
      expect(r.status).toBe(400)
    }
    const r = await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect(r.status).toBe(429)
    expect((await r.json()).pesan).toBe('Terlalu banyak percobaan. Coba lagi dalam 15 menit.')
  })

  it('sandi lama benar mereset hitungan gagal', async () => {
    for (let i = 0; i < 3; i++) await POST(req({ sandiLama: 'salah', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))
    expect((await POST(req({ sandiLama: 'lama-12345', sandiBaru: 'baru-12345', konfirmasi: 'baru-12345' }))).status).toBe(200)
    expect(await prisma.percobaanMasuk.count({ where: { kunci: `ganti-sandi:admin:${adminId}` } })).toBe(0)
  })
})
