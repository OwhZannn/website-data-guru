import { describe, it, expect, beforeEach, vi } from 'vitest'

let tokenSekarang = 'tok'
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' ? { value: tokenSekarang } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatSesi } from '../../src/lib/sesi'
import { GET, POST } from '../../src/app/api/admin/alasan/route'

const req = (b: unknown) =>
  new Request('http://x/api/admin/alasan', { method: 'POST', body: JSON.stringify(b) })
const reqGet = (params = '') =>
  new Request(`http://x/api/admin/alasan${params}`)

describe('GET /api/admin/alasan', () => {
  let adminId: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    tokenSekarang = await buatSesi(adminId, 'admin')
  })

  it('kembalikan daftar kosong bila tidak ada', async () => {
    const r = await GET(reqGet())
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.baris).toEqual([])
  })

  it('kembalikan hanya yang aktif secara default', async () => {
    await prisma.alasanTolak.createMany({
      data: [
        { id: 'a1', teks: 'Aktif', urutan: 1, aktif: true },
        { id: 'a2', teks: 'Nonaktif', urutan: 2, aktif: false },
      ],
    })
    const r = await GET(reqGet())
    const j = await r.json()
    expect(j.baris).toHaveLength(1)
    expect(j.baris[0].teks).toBe('Aktif')
  })

  it('?semua=1 mengembalikan semua termasuk nonaktif', async () => {
    await prisma.alasanTolak.createMany({
      data: [
        { id: 'a1', teks: 'Aktif', urutan: 1, aktif: true },
        { id: 'a2', teks: 'Nonaktif', urutan: 2, aktif: false },
      ],
    })
    const r = await GET(reqGet('?semua=1'))
    const j = await r.json()
    expect(j.baris).toHaveLength(2)
  })

  it('401 untuk bukan admin', async () => {
    const guru = await prisma.guru.create({ data: { nama: 'G', username: 'u1', hashSandi: 'x' } })
    tokenSekarang = await buatSesi(guru.id, 'guru')
    const r = await GET(reqGet())
    expect(r.status).toBe(401)
  })
})

describe('POST /api/admin/alasan — tambah', () => {
  let adminId: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    tokenSekarang = await buatSesi(adminId, 'admin')
  })

  it('tambah alasan baru', async () => {
    const r = await POST(req({ aksi: 'tambah', teks: 'File buram' }))
    expect(r.status).toBe(200)
    expect((await r.json()).ok).toBe(true)
    const baris = await prisma.alasanTolak.findFirst({ where: { teks: 'File buram' } })
    expect(baris).toBeTruthy()
    expect(baris!.aktif).toBe(true)
  })

  it('teks kosong → 400', async () => {
    const r = await POST(req({ aksi: 'tambah', teks: '   ' }))
    expect(r.status).toBe(400)
  })

  it('401 untuk bukan admin', async () => {
    const guru = await prisma.guru.create({ data: { nama: 'G', username: 'u1', hashSandi: 'x' } })
    tokenSekarang = await buatSesi(guru.id, 'guru')
    const r = await POST(req({ aksi: 'tambah', teks: 'X' }))
    expect(r.status).toBe(401)
  })
})

describe('POST /api/admin/alasan — ubah, aktifkan, nonaktifkan, urut', () => {
  let adminId: string
  let id1: string
  let id2: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    tokenSekarang = await buatSesi(adminId, 'admin')
    const a1 = await prisma.alasanTolak.create({ data: { teks: 'Alasan A', urutan: 1 } })
    const a2 = await prisma.alasanTolak.create({ data: { teks: 'Alasan B', urutan: 2 } })
    id1 = a1.id
    id2 = a2.id
  })

  it('ubah teks', async () => {
    const r = await POST(req({ aksi: 'ubah', id: id1, teks: 'Alasan baru' }))
    expect((await r.json()).ok).toBe(true)
    expect((await prisma.alasanTolak.findUnique({ where: { id: id1 } }))!.teks).toBe('Alasan baru')
  })

  it('nonaktifkan', async () => {
    const r = await POST(req({ aksi: 'nonaktifkan', id: id1 }))
    expect((await r.json()).ok).toBe(true)
    expect((await prisma.alasanTolak.findUnique({ where: { id: id1 } }))!.aktif).toBe(false)
  })

  it('aktifkan kembali', async () => {
    await prisma.alasanTolak.update({ where: { id: id1 }, data: { aktif: false } })
    const r = await POST(req({ aksi: 'aktifkan', id: id1 }))
    expect((await r.json()).ok).toBe(true)
    expect((await prisma.alasanTolak.findUnique({ where: { id: id1 } }))!.aktif).toBe(true)
  })

  it('urutkan naik — tukar dengan baris di atasnya', async () => {
    // id2 (urutan 2) → naik → seharusnya jadi 1
    const r = await POST(req({ aksi: 'urut', id: id2, arah: 'naik' }))
    expect((await r.json()).ok).toBe(true)
    const a1 = await prisma.alasanTolak.findUnique({ where: { id: id1 } })
    const a2 = await prisma.alasanTolak.findUnique({ where: { id: id2 } })
    expect(a2!.urutan).toBeLessThan(a1!.urutan)
  })

  it('urutkan pertama ke atas → 400', async () => {
    // id1 (urutan 1) sudah paling atas
    const r = await POST(req({ aksi: 'urut', id: id1, arah: 'naik' }))
    expect(r.status).toBe(400)
  })

  it('id tidak ada → 400', async () => {
    const r = await POST(req({ aksi: 'ubah', id: 'tidak-ada', teks: 'X' }))
    expect(r.status).toBe(400)
  })
})
