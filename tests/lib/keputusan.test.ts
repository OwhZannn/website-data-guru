import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { sahkanDokumen, tolakDokumen, batalkanKeputusan } from '../../src/lib/keputusan'
import { GalatPengguna } from '../../src/lib/galat'

describe('keputusan admin', () => {
  let adminId: string
  let dokumenGuruId: string
  let dokumenId: string

  const buatBaris = (status: string, fileId: string | null = 'f1') =>
    prisma.dokumenGuru.update({ where: { id: dokumenGuruId }, data: { status, fileId } })


  beforeEach(async () => {
    await bersihkanSemua()
    const admin = await prisma.admin.create({ data: { nama: 'Admin', email: 'a@contoh.id', hashSandi: 'x' } })
    adminId = admin.id
    const guru = await prisma.guru.create({ data: { nama: 'Guru', nip: '1', email: 'g@contoh.id', hashSandi: 'x' } })
    const periode = await prisma.periode.create({ data: { nama: 'P', dibuka: false } })
    const dok = await prisma.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'SK', urutan: 0 } })
    dokumenId = dok.id
    const dg = await prisma.dokumenGuru.create({
      data: {
        periodeId: periode.id, guruId: guru.id, dokumenId, status: 'MENUNGGU',
        fileId: 'f1', namaFile: 'a.pdf', tipe: 'application/pdf', ukuran: 1, diunggahPada: new Date(),
      },
    })
    dokumenGuruId = dg.id
  })

  it('menyahkan mencatat admin dan waktu', async () => {
    await sahkanDokumen({ dokumenGuruId, adminId })
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d).toMatchObject({ status: 'SAH', diperiksaOleh: adminId, alasan: null })
    expect(d!.diperiksaPada).not.toBeNull()
    const r = await prisma.riwayat.findMany({ where: { dokumenId } })
    expect(r).toMatchObject([{ aksi: 'sahkan', oleh: adminId, olehTipe: 'admin' }])
  })

  it('menolak tanpa alasan ditolak sistem', async () => {
    await expect(tolakDokumen({ dokumenGuruId, adminId, alasan: '   ' }))
      .rejects.toThrow('Alasan penolakan wajib diisi')
    expect((await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } }))!.status).toBe('MENUNGGU')
    expect(await prisma.riwayat.count()).toBe(0)
  })

  it('menolak tanpa objek alasan sama sekali', async () => {
    await expect(tolakDokumen({ dokumenGuruId, adminId } as any))
      .rejects.toThrow('Alasan penolakan wajib diisi')
  })

  it('alasan lebih dari 1000 karakter ditolak', async () => {
    await expect(tolakDokumen({ dokumenGuruId, adminId, alasan: 'x'.repeat(1001) }))
      .rejects.toThrow('Alasan maksimal 1000 karakter')
  })

  it('menolak dengan alasan menyimpan alasannya (dipangkas)', async () => {
    await tolakDokumen({ dokumenGuruId, adminId, alasan: '  Stempel terpotong ' })
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d).toMatchObject({ status: 'DITOLAK', alasan: 'Stempel terpotong', diperiksaOleh: adminId })
    const r = await prisma.riwayat.findMany({ where: { dokumenId } })
    expect(r).toMatchObject([{ aksi: 'tolak', alasan: 'Stempel terpotong' }])
  })

  it('sahkan/tolak hanya untuk dokumen yang menunggu', async () => {
    await buatBaris('SAH')
    await expect(tolakDokumen({ dokumenGuruId, adminId, alasan: 'x' }))
      .rejects.toThrow('Dokumen ini tidak sedang menunggu pemeriksaan')
    await expect(sahkanDokumen({ dokumenGuruId, adminId }))
      .rejects.toThrow('Dokumen ini tidak sedang menunggu pemeriksaan')
    await buatBaris('MENUNGGU', null)
    await expect(sahkanDokumen({ dokumenGuruId, adminId })).rejects.toBeInstanceOf(GalatPengguna)
    expect(await prisma.riwayat.count()).toBe(0)
  })

  it('membatalkan keputusan wajib beralasan', async () => {
    await expect(batalkanKeputusan({ dokumenGuruId, adminId, alasan: '', statusBaru: 'DITOLAK' }))
      .rejects.toThrow('Alasan pembatalan wajib diisi')
  })

  it('membatalkan keputusan mengubah status dan mencatatnya', async () => {
    await sahkanDokumen({ dokumenGuruId, adminId })
    await batalkanKeputusan({ dokumenGuruId, adminId, alasan: 'Salah orang', statusBaru: 'DITOLAK' })
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d).toMatchObject({ status: 'DITOLAK', alasan: 'Salah orang' })
    const r = await prisma.riwayat.findMany({ where: { dokumenId } })
    expect(r.map(x => x.aksi)).toContain('batalkan')
    await batalkanKeputusan({ dokumenGuruId, adminId, alasan: 'Ternyata benar', statusBaru: 'SAH' })
    expect(await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })).toMatchObject({ status: 'SAH', alasan: null })
  })

  it('pembatalan ke status yang sama atau dari MENUNGGU ditolak', async () => {
    await expect(batalkanKeputusan({ dokumenGuruId, adminId, alasan: 'x', statusBaru: 'SAH' }))
      .rejects.toThrow('Status baru sama dengan status sekarang')
    await sahkanDokumen({ dokumenGuruId, adminId })
    await expect(batalkanKeputusan({ dokumenGuruId, adminId, alasan: 'x', statusBaru: 'SAH' }))
      .rejects.toThrow('Status baru sama dengan status sekarang')
    expect(await prisma.riwayat.count()).toBe(1)
  })

  it('menolak keputusan atas dokumen yang tidak ada', async () => {
    await expect(sahkanDokumen({ dokumenGuruId: 'tidak-ada', adminId }))
      .rejects.toThrow('Dokumen tidak ditemukan')
  })

  it('dua keputusan bersamaan: tepat satu menang, tidak ada yang hilang diam-diam', async () => {
    const hasil = await Promise.allSettled([
      sahkanDokumen({ dokumenGuruId, adminId }),
      tolakDokumen({ dokumenGuruId, adminId, alasan: 'Kurang jelas' }),
    ])
    const menang = hasil.findIndex((h) => h.status === 'fulfilled')
    expect(hasil.filter((h) => h.status === 'fulfilled')).toHaveLength(1)
    const kalah = hasil.find((h) => h.status === 'rejected') as PromiseRejectedResult
    expect(String(kalah.reason?.message)).toMatch(/tidak sedang menunggu|SQLITE_BUSY|database is locked/)
    const r = await prisma.riwayat.findMany({ where: { dokumenId } })
    expect(r).toHaveLength(1)
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d!.status).toBe(menang === 0 ? 'SAH' : 'DITOLAK')
    expect(r[0].aksi).toBe(menang === 0 ? 'sahkan' : 'tolak')
  })
})
