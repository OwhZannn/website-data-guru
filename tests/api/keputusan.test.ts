import { describe, it, expect, beforeEach, vi } from 'vitest'

let tokenSekarang = 'tok'
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' ? { value: tokenSekarang } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatSesi } from '../../src/lib/sesi'
import { POST } from '../../src/app/api/admin/keputusan/route'

const req = (b: unknown) => new Request('http://x/api/admin/keputusan', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/admin/keputusan', () => {
  let adminId: string
  let dokumenGuruId: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    const guru = await prisma.guru.create({ data: { nama: 'G', nip: '1', email: 'g@x.id', hashSandi: 'x' } })
    const p = await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
    const d = await prisma.daftarDokumen.create({ data: { periodeId: p.id, nama: 'SK', urutan: 0 } })
    dokumenGuruId = (await prisma.dokumenGuru.create({
      data: { periodeId: p.id, guruId: guru.id, dokumenId: d.id, status: 'MENUNGGU', fileId: 'f', namaFile: 'a.pdf', tipe: 'application/pdf', ukuran: 1, diunggahPada: new Date() },
    })).id
    tokenSekarang = await buatSesi(adminId, 'admin')
  })

  it('401 untuk sesi guru', async () => {
    tokenSekarang = await buatSesi((await prisma.guru.findFirst())!.id, 'guru')
    expect((await POST(req({ aksi: 'sahkan', dokumenGuruId }))).status).toBe(401)
  })

  it('tolak tanpa alasan → 400 dan tidak mengubah apa pun', async () => {
    const r = await POST(req({ aksi: 'tolak', dokumenGuruId }))
    expect(r.status).toBe(400)
    expect((await r.json()).pesan).toBe('Alasan penolakan wajib diisi')
    expect((await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } }))!.status).toBe('MENUNGGU')
  })

  it('adminId diambil dari sesi, bukan dari klien', async () => {
    const r = await POST(req({ aksi: 'tolak', dokumenGuruId, alasan: 'Buram', adminId: 'palsu' }))
    expect(r.status).toBe(200)
    expect(await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })).toMatchObject({ status: 'DITOLAK', diperiksaOleh: adminId })
  })

  it('aksi tidak dikenal → 400', async () => {
    expect((await POST(req({ aksi: 'hapus', dokumenGuruId }))).status).toBe(400)
  })
})
