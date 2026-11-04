import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}))

vi.mock('googleapis', () => ({
  google: {
    drive: () => ({ files: { create: m.create, list: m.list, delete: m.del, get: m.get } }),
    auth: { OAuth2: class { setCredentials() {} } },
  },
}))

import { unggahKeDrive, folderGuru, hapusDariDrive } from '../../src/lib/drive'

const ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'DRIVE_FOLDER_ID']
const berkas = { folderId: 'f1', namaFile: 'a.pdf', tipe: 'application/pdf', isi: Buffer.from('x') }

beforeEach(() => {
  vi.resetAllMocks()
  for (const k of ENV) process.env[k] = `nilai-${k}`
})

describe('unggahKeDrive', () => {
  it('mengembalikan fileId dari Drive', async () => {
    m.create.mockResolvedValue({ data: { id: 'file-abc' } })
    expect((await unggahKeDrive(berkas)).fileId).toBe('file-abc')
  })

  it('meneruskan alasan galat Drive apa adanya', async () => {
    m.create.mockRejectedValueOnce(new Error('invalid_grant'))
    await expect(unggahKeDrive(berkas)).rejects.toThrow('invalid_grant')
  })

  it('menyebut variabel env yang hilang', async () => {
    delete process.env.GOOGLE_REFRESH_TOKEN
    await expect(unggahKeDrive(berkas)).rejects.toThrow('GOOGLE_REFRESH_TOKEN')
  })
})

describe('folderGuru', () => {
  it('meloloskan tanda kutip dan backslash dalam query', async () => {
    m.list.mockResolvedValue({ data: { files: [{ id: 'x' }] } })
    await folderGuru('123', "O'Neil")
    const q: string = m.list.mock.calls[0][0].q
    expect(q).toContain("O\\'Neil")
    expect(q).toContain('trashed = false')
    expect(q).toContain("mimeType = 'application/vnd.google-apps.folder'")
    expect(q).toContain("'nilai-DRIVE_FOLDER_ID' in parents")
    expect(m.list.mock.calls[0][0].orderBy).toBe('createdTime')
  })

  it('membuat folder bila belum ada', async () => {
    m.list.mockResolvedValue({ data: { files: [] } })
    m.create.mockResolvedValue({ data: { id: 'baru' } })
    expect(await folderGuru('1', 'Ani')).toBe('baru')
  })
})

describe('hapusDariDrive', () => {
  it('menganggap 404 sebagai berhasil', async () => {
    m.del.mockRejectedValue({ code: 404 })
    await expect(hapusDariDrive('x')).resolves.toBeUndefined()
  })
  it('melempar ulang galat lain', async () => {
    m.del.mockRejectedValue({ code: 500, message: 'boom' })
    await expect(hapusDariDrive('x')).rejects.toMatchObject({ code: 500 })
  })
})
