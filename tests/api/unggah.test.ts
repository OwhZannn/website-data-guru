import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../src/lib/drive', () => ({
  folderGuru: vi.fn().mockResolvedValue('folder-1'),
  unggahKeDrive: vi.fn().mockResolvedValue({ fileId: 'file-1' }),
  hapusDariDrive: vi.fn().mockResolvedValue(undefined),
}))
let tokenSesi: string | undefined
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (tokenSesi ? { value: tokenSesi } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { unggahDokumen } from '../../src/lib/unggahDokumen'
import { buatSesi } from '../../src/lib/sesi'
import { POST } from '../../src/app/api/dokumen/unggah/route'
import * as drive from '../../src/lib/drive'

const pdf = Buffer.from('%PDF-1.4\nisi')
let adminId: string, guruId: string, periodeId: string, dokumenId: string

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(drive.unggahKeDrive).mockResolvedValue({ fileId: 'file-1' })
  tokenSesi = undefined
  await prisma.riwayat.deleteMany()
  await prisma.dokumenGuru.deleteMany()
  await prisma.daftarDokumen.deleteMany()
  await prisma.periode.deleteMany()
  await prisma.sesi.deleteMany()
  await prisma.guru.deleteMany()
  await prisma.admin.deleteMany()
  adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.com', hashSandi: 'x' } })).id
  guruId = (await prisma.guru.create({ data: { nama: 'Budi', nip: '123', email: 'g@x.com', hashSandi: 'x' } })).id
  periodeId = (await prisma.periode.create({ data: { nama: '2026', dibuka: true } })).id
  dokumenId = (await prisma.daftarDokumen.create({ data: { periodeId, nama: 'Ijazah', urutan: 1 } })).id
})

const unggah = (lebih: Partial<Parameters<typeof unggahDokumen>[0]> = {}) =>
  unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId, ...lebih })

describe('unggahDokumen', () => {
  it('mencatat status MENUNGGU setelah unggahan berhasil', async () => {
    const h = await unggah()
    expect(h.status).toBe('MENUNGGU')
    const baris = await prisma.dokumenGuru.findFirst({ where: { guruId, dokumenId } })
    expect(baris).toMatchObject({ status: 'MENUNGGU', fileId: 'file-1', tipe: 'application/pdf' })
    const tgl = new Date().toISOString().slice(0, 10)
    expect(drive.folderGuru).toHaveBeenCalledWith('123', 'Budi')
    expect(drive.unggahKeDrive).toHaveBeenCalledWith(expect.objectContaining({
      folderId: 'folder-1', namaFile: `Ijazah - ${tgl}.pdf`, tipe: 'application/pdf',
    }))
    expect(await prisma.riwayat.findMany({ where: { guruId } })).toMatchObject([{ aksi: 'unggah', olehTipe: 'guru' }])
  })

  it('menolak unggahan saat periode tertutup', async () => {
    await prisma.periode.update({ where: { id: periodeId }, data: { dibuka: false } })
    await expect(unggah()).rejects.toThrow('Masa pengunggahan sedang ditutup')
  })

  it('menolak mengganti dokumen yang sudah sah', async () => {
    await unggah()
    await prisma.dokumenGuru.updateMany({ where: { guruId, dokumenId }, data: { status: 'SAH' } })
    await expect(unggah()).rejects.toThrow('Dokumen ini sudah dinyatakan sah')
  })

  it('mengizinkan mengganti dokumen yang masih menunggu', async () => {
    await unggah()
    const h = await unggah({ nama: 'b.pdf' })
    expect(h.status).toBe('MENUNGGU')
    const aksi = (await prisma.riwayat.findMany({ where: { guruId }, orderBy: { waktu: 'asc' } })).map((r) => r.aksi)
    expect(aksi.sort()).toEqual(['ganti_file', 'unggah'])
  })

  it('tidak menyimpan baris apa pun bila Drive gagal', async () => {
    vi.mocked(drive.unggahKeDrive).mockRejectedValueOnce(new Error('invalid_grant'))
    await expect(unggah({ isi: Buffer.from('%PDF-x') })).rejects.toThrow('invalid_grant')
    const baris = await prisma.dokumenGuru.findFirst({ where: { guruId, dokumenId } })
    expect(baris?.fileId ?? null).toBeNull()
  })

  it('menghapus file lama dari Drive saat mengganti file yang menunggu', async () => {
    await unggah()
    vi.mocked(drive.unggahKeDrive).mockResolvedValueOnce({ fileId: 'file-2' })
    await unggah({ nama: 'b.pdf' })
    expect(drive.hapusDariDrive).toHaveBeenCalledWith('file-1')
  })

  it('tetap berhasil bila penghapusan file lama gagal', async () => {
    await unggah()
    vi.mocked(drive.unggahKeDrive).mockResolvedValueOnce({ fileId: 'file-2' })
    vi.mocked(drive.hapusDariDrive).mockRejectedValueOnce(new Error('boom'))
    await expect(unggah()).resolves.toEqual({ status: 'MENUNGGU' })
    expect((await prisma.dokumenGuru.findFirst({ where: { guruId } }))?.fileId).toBe('file-2')
  })

  it('menolak berkas tidak sah sebelum menyentuh Drive', async () => {
    await expect(unggah({ isi: Buffer.from('MZ..') })).rejects.toThrow('Isi berkas bukan PDF atau JPG yang sah')
    expect(drive.unggahKeDrive).not.toHaveBeenCalled()
  })

  it('menolak dokumen nonaktif atau dari periode lain', async () => {
    await prisma.daftarDokumen.update({ where: { id: dokumenId }, data: { aktif: false } })
    await expect(unggah()).rejects.toThrow('Dokumen tidak ditemukan atau tidak aktif')
    const lain = await prisma.periode.create({ data: { nama: 'lain' } })
    const dokLain = await prisma.daftarDokumen.create({ data: { periodeId: lain.id, nama: 'X', urutan: 1 } })
    await expect(unggah({ dokumenId: dokLain.id })).rejects.toThrow('Dokumen tidak ditemukan atau tidak aktif')
    expect(drive.unggahKeDrive).not.toHaveBeenCalled()
  })
})

const form = (isi: Record<string, string | Blob>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(isi)) f.append(k, v)
  return new Request('http://x/api/dokumen/unggah', { method: 'POST', body: f })
}

describe('POST /api/dokumen/unggah', () => {
  it('membalas 200 MENUNGGU untuk guru yang masuk', async () => {
    tokenSesi = await buatSesi(guruId, 'guru')
    const res = await POST(form({ dokumenId, berkas: new File([pdf], 'a.pdf', { type: 'application/pdf' }) }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, status: 'MENUNGGU' })
  })

  it('membalas 400 bila berkas tidak ada', async () => {
    tokenSesi = await buatSesi(guruId, 'guru')
    const res = await POST(form({ dokumenId }))
    expect(res.status).toBe(400)
    expect((await res.json()).ok).toBe(false)
  })

  it('membalas 400 bila dokumenId tidak ada', async () => {
    tokenSesi = await buatSesi(guruId, 'guru')
    const res = await POST(form({ berkas: new File([pdf], 'a.pdf', { type: 'application/pdf' }) }))
    expect(res.status).toBe(400)
  })

  it('membalas 400 bila tidak ada periode dibuka', async () => {
    tokenSesi = await buatSesi(guruId, 'guru')
    await prisma.periode.update({ where: { id: periodeId }, data: { dibuka: false } })
    const res = await POST(form({ dokumenId, berkas: new File([pdf], 'a.pdf', { type: 'application/pdf' }) }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, pesan: 'Masa pengunggahan sedang ditutup' })
  })

  it('membalas 401 bila belum masuk', async () => {
    const res = await POST(form({ dokumenId }))
    expect(res.status).toBe(401)
  })
})
