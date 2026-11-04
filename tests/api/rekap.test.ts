import { describe, it, expect, beforeEach, vi } from 'vitest'

let tokenSekarang = 'tok'
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' ? { value: tokenSekarang } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatSesi } from '../../src/lib/sesi'
import { GET } from '../../src/app/api/admin/rekap/route'

const req = (q: string) => new Request(`http://x/api/admin/rekap?${q}`)
let periodeId: string

beforeEach(async () => {
  await bersihkanSemua()
  const a = await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })
  tokenSekarang = await buatSesi(a.id, 'admin')
  periodeId = (await prisma.periode.create({ data: { nama: 'Semester Ganjil 2026', dibuka: false } })).id
})

describe('GET /api/admin/rekap', () => {
  it('mengunduh CSV dengan header unduhan dan no-store (periode tertutup pun boleh)', async () => {
    const r = await GET(req(`periodeId=${periodeId}&format=csv`))
    expect(r.status).toBe(200)
    expect(r.headers.get('Cache-Control')).toBe('no-store')
    expect(r.headers.get('Content-Disposition')).toMatch(/^attachment; filename="rekap-semester-ganjil-2026-\d{4}-\d{2}-\d{2}\.csv"$/)
    expect(await r.text()).toContain('NIP;Nama')
  })
  it('xlsx', async () => {
    const r = await GET(req(`periodeId=${periodeId}&format=xlsx`))
    expect(r.headers.get('Content-Disposition')).toMatch(/\.xlsx"$/)
    expect((await r.arrayBuffer()).byteLength).toBeGreaterThan(100)
  })
  it('periode tidak ada -> 400', async () => {
    const r = await GET(req('periodeId=nope&format=csv'))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Periode tidak ditemukan')
  })
  it('tanpa sesi admin ditolak', async () => {
    tokenSekarang = 'salah'
    const r = await GET(req(`periodeId=${periodeId}&format=csv`))
    expect(r.status).toBeGreaterThanOrEqual(400)
  })
})
