import { describe, it, expect, beforeEach, vi } from 'vitest'

let tokenSekarang = 'tok'
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (n: string) => (n === 'sesi' ? { value: tokenSekarang } : undefined) }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { buatSesi } from '../../src/lib/sesi'
import { POST } from '../../src/app/api/admin/keputusan/massal/route'

const req = (b: unknown) =>
  new Request('http://x/api/admin/keputusan/massal', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/admin/keputusan/massal', () => {
  let adminId: string
  let guruId: string
  let periodeId: string
  let dok1Id: string
  let dok2Id: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    const guru = await prisma.guru.create({ data: { nama: 'G', username: '1', nip: '1', hashSandi: 'x' } })
    guruId = guru.id
    const p = await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
    periodeId = p.id
    const d1 = await prisma.daftarDokumen.create({ data: { periodeId: p.id, nama: 'SK', urutan: 0 } })
    const d2 = await prisma.daftarDokumen.create({ data: { periodeId: p.id, nama: 'Ijazah', urutan: 1 } })
    dok1Id = (await prisma.dokumenGuru.create({
      data: { periodeId: p.id, guruId, dokumenId: d1.id, status: 'MENUNGGU', fileId: 'f1', namaFile: 'a.pdf', tipe: 'application/pdf', ukuran: 1, diunggahPada: new Date() },
    })).id
    dok2Id = (await prisma.dokumenGuru.create({
      data: { periodeId: p.id, guruId, dokumenId: d2.id, status: 'MENUNGGU', fileId: 'f2', namaFile: 'b.pdf', tipe: 'application/pdf', ukuran: 1, diunggahPada: new Date() },
    })).id
    tokenSekarang = await buatSesi(adminId, 'admin')
  })

  const semua = () => [{ id: dok1Id, fileId: 'f1' }, { id: dok2Id, fileId: 'f2' }]

  it('sahkan semua dokumen MENUNGGU dengan file', async () => {
    const r = await POST(req({ guruId, periodeId, dokumen: semua() }))
    const j = await r.json()
    expect(r.status).toBe(200)
    expect(j.ok).toBe(true)
    expect(j.jumlah).toBe(2)
    const d1 = await prisma.dokumenGuru.findUnique({ where: { id: dok1Id } })
    const d2 = await prisma.dokumenGuru.findUnique({ where: { id: dok2Id } })
    expect(d1!.status).toBe('SAH')
    expect(d2!.status).toBe('SAH')
    expect(d1!.diperiksaOleh).toBe(adminId)
  })

  it('menulis riwayat untuk setiap dokumen', async () => {
    await POST(req({ guruId, periodeId, dokumen: semua() }))
    const riwayat = await prisma.riwayat.findMany({ where: { guruId, periodeId } })
    expect(riwayat).toHaveLength(2)
    expect(riwayat.every((r) => r.aksi === 'sahkan')).toBe(true)
    expect(riwayat.every((r) => r.olehTipe === 'admin')).toBe(true)
    expect(riwayat.every((r) => r.oleh === adminId)).toBe(true)
  })

  it('dokumen tanpa file dilewati', async () => {
    // Update dok1 agar tidak punya file
    await prisma.dokumenGuru.update({ where: { id: dok1Id }, data: { fileId: null } })
    const r = await POST(req({ guruId, periodeId, dokumen: semua() }))
    const j = await r.json()
    expect(j.jumlah).toBe(1)
    expect((await prisma.dokumenGuru.findUnique({ where: { id: dok1Id } }))!.status).toBe('MENUNGGU')
    expect((await prisma.dokumenGuru.findUnique({ where: { id: dok2Id } }))!.status).toBe('SAH')
  })

  it('tidak ada dokumen menunggu → jumlah 0', async () => {
    await prisma.dokumenGuru.updateMany({ where: { guruId, periodeId }, data: { status: 'SAH' } })
    const r = await POST(req({ guruId, periodeId, dokumen: semua() }))
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.jumlah).toBe(0)
  })

  it('file yang diganti setelah halaman dibuka tidak disahkan', async () => {
    await prisma.dokumenGuru.update({ where: { id: dok1Id }, data: { fileId: 'f1-baru' } })
    const j = await (await POST(req({ guruId, periodeId, dokumen: semua() }))).json()
    expect(j.jumlah).toBe(1)
    expect(j.dilewati).toBe(1)
    expect((await prisma.dokumenGuru.findUnique({ where: { id: dok1Id } }))!.status).toBe('MENUNGGU')
  })

  it('dokumen guru lain tidak bisa disahkan lewat guruId ini', async () => {
    const lain = await prisma.guru.create({ data: { nama: 'L', username: '2', nip: '2', hashSandi: 'x' } })
    const j = await (await POST(req({ guruId: lain.id, periodeId, dokumen: semua() }))).json()
    expect(j.jumlah).toBe(0)
    expect((await prisma.dokumenGuru.findUnique({ where: { id: dok1Id } }))!.status).toBe('MENUNGGU')
  })

  it('401 untuk bukan admin', async () => {
    tokenSekarang = await buatSesi(guruId, 'guru')
    const r = await POST(req({ guruId, periodeId, dokumen: semua() }))
    expect(r.status).toBe(401)
  })

  it('guru tidak ada → 400', async () => {
    const r = await POST(req({ guruId: 'tidak-ada', periodeId, dokumen: semua() }))
    expect(r.status).toBe(400)
  })

  it('permintaan tidak valid → 400', async () => {
    const r = await POST(req({}))
    expect(r.status).toBe(400)
  })
})
