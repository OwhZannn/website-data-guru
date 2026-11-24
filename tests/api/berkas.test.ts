import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Readable } from 'node:stream'
import type { NextRequest } from 'next/server'

let tokenSesi = ''
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' && tokenSesi ? { value: tokenSesi } : undefined) }),
}))

vi.mock('../../src/lib/drive', () => ({
  unduhStreamDrive: vi.fn(),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatSesi } from '../../src/lib/sesi'
import { unduhStreamDrive } from '../../src/lib/drive'
import { GET } from '../../src/app/api/dokumen/berkas/[fileId]/route'

let adminId = ''
let guruId = ''
let guruLainId = ''
let periodeId = ''
let dokumenId = ''
const FILE_ID = 'file-test-123'

beforeEach(async () => {
  await bersihkanSemua()
  tokenSesi = ''
  vi.mocked(unduhStreamDrive).mockReset().mockResolvedValue({
    stream: Readable.from(Buffer.from('%PDF-1.4 test')),
    nama: 'sk-berkala.pdf',
    tipe: 'application/pdf',
    ukuran: 14,
  })

  adminId = (await prisma.admin.create({ data: { email: 'adm@x.id', nama: 'Admin', hashSandi: 'x' } })).id
  guruId = (await prisma.guru.create({ data: { username: '111', nip: '111', nama: 'Guru 1', hashSandi: 'x' } })).id
  guruLainId = (await prisma.guru.create({ data: { username: '222', nip: '222', nama: 'Guru 2', hashSandi: 'x' } })).id
  const p = await prisma.periode.create({ data: { nama: 'Periode 2026', dibuka: true } })
  periodeId = p.id
  const d = await prisma.daftarDokumen.create({ data: { periodeId, nama: 'SK Berkala', urutan: 1 } })
  dokumenId = d.id

  await prisma.dokumenGuru.create({
    data: {
      periodeId,
      guruId,
      dokumenId,
      fileId: FILE_ID,
      namaFile: 'sk-berkala.pdf',
      status: 'MENUNGGU',
    },
  })
})

describe('GET /api/dokumen/berkas/[fileId]', () => {
  it('401 jika tanpa sesi', async () => {
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: FILE_ID }) })
    expect(res.status).toBe(401)
  })

  it('403 jika guru lain mengakses berkas yang bukan miliknya', async () => {
    tokenSesi = await buatSesi(guruLainId, 'guru')
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: FILE_ID }) })
    expect(res.status).toBe(403)
  })

  it('200 jika guru pemilik mengakses berkas miliknya', async () => {
    tokenSesi = await buatSesi(guruId, 'guru')
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: FILE_ID }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('sk-berkala.pdf')
  })

  it('200 jika admin mengakses berkas guru mana pun yang tercatat', async () => {
    tokenSesi = await buatSesi(adminId, 'admin')
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: FILE_ID }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('404 jika berkas tercatat tetapi tidak ditemukan di Google Drive', async () => {
    tokenSesi = await buatSesi(adminId, 'admin')
    vi.mocked(unduhStreamDrive).mockResolvedValue(null)
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: FILE_ID }) })
    expect(res.status).toBe(404)
  })

  it('404 dan tidak menyentuh Drive jika admin meminta fileId yang tidak tercatat (mis. cadangan basis data)', async () => {
    tokenSesi = await buatSesi(adminId, 'admin')
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: 'berkas-cadangan-db' }) })
    expect(res.status).toBe(404)
    expect(unduhStreamDrive).not.toHaveBeenCalled()
  })

  it('nama berkas non-ASCII dikirim lewat filename* dengan cadangan ASCII, plus nosniff', async () => {
    tokenSesi = await buatSesi(guruId, 'guru')
    vi.mocked(unduhStreamDrive).mockResolvedValue({
      stream: Readable.from(Buffer.from('%PDF-1.4')), nama: 'SK Berkala – 2026 "baru".pdf', tipe: 'application/pdf', ukuran: 8,
    })
    const res = await GET({} as NextRequest, { params: Promise.resolve({ fileId: FILE_ID }) })
    const cd = res.headers.get('Content-Disposition')!
    expect(cd).toContain('filename="SK Berkala _ 2026 _baru_.pdf"')
    expect(cd).toContain("filename*=UTF-8''SK%20Berkala%20%E2%80%93%202026%20%22baru%22.pdf")
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})
