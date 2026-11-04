import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../src/lib/drive', () => ({ periksaDrive: vi.fn() }))
let tokenSesi = ''
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' && tokenSesi ? { value: tokenSesi } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatSesi } from '../../src/lib/sesi'
import { periksaDrive } from '../../src/lib/drive'
import { GET } from '../../src/app/api/kesehatan/route'
import { GET as HIDUP } from '../../src/app/api/hidup/route'

let adminId = ''
let guruId = ''
beforeEach(async () => {
  await bersihkanSemua()
  vi.mocked(periksaDrive).mockReset().mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  adminId = (await prisma.admin.create({ data: { email: 'a@x.id', nama: 'A', hashSandi: 'x' } })).id
  guruId = (await prisma.guru.create({ data: { nip: '1', nama: 'G', email: 'g@x.id', hashSandi: 'x' } })).id
  tokenSesi = ''
})

describe('GET /api/kesehatan', () => {
  it('401 untuk anonim dan guru', async () => {
    expect((await GET()).status).toBe(401)
    tokenSesi = await buatSesi(guruId, 'guru')
    expect((await GET()).status).toBe(401)
  })
  it('melaporkan ok untuk admin', async () => {
    tokenSesi = await buatSesi(adminId, 'admin')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(await res.json()).toEqual({ drive: 'ok', basisData: 'ok' })
  })
  it('melaporkan gagal dengan pesan terjemahan, tetap 200', async () => {
    tokenSesi = await buatSesi(adminId, 'admin')
    vi.mocked(periksaDrive).mockRejectedValue(new Error('invalid_grant'))
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ drive: 'gagal', pesan: 'Hubungan ke Google Drive terputus. Hubungi admin.', basisData: 'ok' })
  })
})

describe('GET /api/hidup', () => {
  it('200 tanpa sesi', async () => {
    const res = await HIDUP()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
