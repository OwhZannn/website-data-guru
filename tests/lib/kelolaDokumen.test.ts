import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import {
  tambahDokumen, ubahDokumen, nonaktifkanDokumen, aktifkanKembaliDokumen, hitungDampakDokumenBaru,
} from '../../src/lib/kelolaDokumen'

describe('kelola dokumen', () => {
  let periodeId: string, adminId: string, guruId: string, d1: string, d2: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    guruId = (await prisma.guru.create({ data: { nama: 'G', nip: '1', email: 'g@x.id', hashSandi: 'x' } })).id
    periodeId = (await prisma.periode.create({ data: { nama: 'P', dibuka: true } })).id
    d1 = (await prisma.daftarDokumen.create({ data: { periodeId, nama: 'SK', urutan: 1 } })).id
    d2 = (await prisma.daftarDokumen.create({ data: { periodeId, nama: 'Ijazah', urutan: 2 } })).id
    for (const dokumenId of [d1, d2]) {
      await prisma.dokumenGuru.create({ data: { periodeId, guruId, dokumenId, status: 'SAH', fileId: 'f' } })
    }
  })

  const riwayat = () => prisma.riwayat.findMany({ where: { aksi: 'ubah_daftar_dokumen' } })

  it('menghitung guru yang akan kembali tidak lengkap', async () => {
    expect(await hitungDampakDokumenBaru(periodeId)).toBe(1)
  })

  it('menambah dokumen membuat guru lengkap kembali tidak lengkap', async () => {
    const h = await tambahDokumen({ periodeId, nama: 'Kartu Pegawai', urutan: 3, adminId })
    expect(h.akanTidakLengkap).toBe(1)
    expect(await prisma.dokumenGuru.findFirst({ where: { guruId, periodeId, dokumen: { nama: 'Kartu Pegawai' } } })).toBeNull()
    expect(await hitungDampakDokumenBaru(periodeId)).toBe(0)
    const r = await riwayat()
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ alasan: 'Menambah dokumen: Kartu Pegawai', oleh: adminId, olehTipe: 'admin', periodeId })
  })

  it('urutan otomatis max+1 dan nama dipangkas', async () => {
    await tambahDokumen({ periodeId, nama: '  Kartu  ', adminId })
    const d = await prisma.daftarDokumen.findFirst({ where: { nama: 'Kartu' } })
    expect(d?.urutan).toBe(3)
  })

  it('menolak nama kosong, terlalu panjang, dan kembar (tanpa beda huruf besar)', async () => {
    await expect(tambahDokumen({ periodeId, nama: '   ', adminId })).rejects.toThrow('Nama dokumen wajib diisi')
    await expect(tambahDokumen({ periodeId, nama: 'a'.repeat(201), adminId })).rejects.toThrow('Nama dokumen maksimal 200 karakter')
    await expect(tambahDokumen({ periodeId, nama: 'sk', adminId })).rejects.toThrow('Dokumen dengan nama ini sudah ada')
    expect(await prisma.daftarDokumen.count()).toBe(2)
    expect(await riwayat()).toHaveLength(0)
  })

  it('menonaktifkan dokumen tidak menghapus barisnya', async () => {
    await nonaktifkanDokumen({ dokumenId: d1, adminId })
    expect((await prisma.daftarDokumen.findUnique({ where: { id: d1 } }))?.aktif).toBe(false)
    expect(await prisma.dokumenGuru.count({ where: { dokumenId: d1 } })).toBe(1)
    expect((await riwayat())[0].alasan).toBe('Menonaktifkan dokumen: SK')
    await expect(nonaktifkanDokumen({ dokumenId: d1, adminId })).rejects.toThrow('sudah nonaktif')
  })

  it('mengaktifkan kembali tercatat, dan dampaknya memperhitungkan SAH lama', async () => {
    await nonaktifkanDokumen({ dokumenId: d1, adminId })
    await aktifkanKembaliDokumen({ dokumenId: d1, adminId })
    expect((await prisma.daftarDokumen.findUnique({ where: { id: d1 } }))?.aktif).toBe(true)
    expect(await riwayat()).toHaveLength(2)
    await nonaktifkanDokumen({ dokumenId: d1, adminId })
    await prisma.dokumenGuru.updateMany({ where: { dokumenId: d1 }, data: { status: 'DITOLAK' } })
    expect(await hitungDampakDokumenBaru(periodeId, d1)).toBe(1)
    await prisma.dokumenGuru.updateMany({ where: { dokumenId: d1 }, data: { status: 'SAH' } })
    expect(await hitungDampakDokumenBaru(periodeId, d1)).toBe(0)
  })

  it('tidak bisa mengaktifkan kembali bila nama bentrok dengan dokumen aktif', async () => {
    await nonaktifkanDokumen({ dokumenId: d1, adminId })
    await tambahDokumen({ periodeId, nama: 'SK', adminId })
    await expect(aktifkanKembaliDokumen({ dokumenId: d1, adminId })).rejects.toThrow('Dokumen dengan nama ini sudah ada')
  })

  it('mengganti nama dan menukar urutan dengan tetangga', async () => {
    await ubahDokumen({ dokumenId: d1, nama: 'SK Baru', adminId })
    expect((await prisma.daftarDokumen.findUnique({ where: { id: d1 } }))?.nama).toBe('SK Baru')
    await ubahDokumen({ dokumenId: d1, urutan: 2, adminId })
    expect((await prisma.daftarDokumen.findUnique({ where: { id: d1 } }))?.urutan).toBe(2)
    expect((await prisma.daftarDokumen.findUnique({ where: { id: d2 } }))?.urutan).toBe(1)
    await expect(ubahDokumen({ dokumenId: d1, nama: 'ijazah', adminId })).rejects.toThrow('sudah ada')
    await expect(ubahDokumen({ dokumenId: 'tidak-ada', nama: 'x', adminId })).rejects.toThrow('Dokumen tidak ditemukan')
  })
})
