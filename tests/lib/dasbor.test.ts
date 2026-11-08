import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { ringkasanDasbor } from '../../src/lib/dasbor'
import { hashSandi } from '../../src/lib/sandi'

// Helpers
async function buatAdmin() {
  return prisma.admin.create({ data: { nama: 'Admin Test', email: `admin-${Date.now()}@x.id`, hashSandi: await hashSandi('x') } })
}

async function buatGuru(opsi: { nama?: string; aktif?: boolean; disetujui?: boolean } = {}) {
  const id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return prisma.guru.create({
    data: {
      nama: opsi.nama ?? `Guru ${id}`, username: id, nip: id,
      hashSandi: await hashSandi('x'),
      aktif: opsi.aktif ?? true,
      disetujui: opsi.disetujui ?? true,
    },
  })
}

async function buatPeriodeDanDokumen(nama = 'P1', jumlahDok = 2) {
  const periode = await prisma.periode.create({ data: { nama, dibuka: true } })
  const daftar = []
  for (let i = 0; i < jumlahDok; i++) {
    daftar.push(
      await prisma.daftarDokumen.create({
        data: { periodeId: periode.id, nama: `Dokumen ${i + 1}`, urutan: i, aktif: true },
      })
    )
  }
  return { periode, daftar }
}

async function unggahDokumen(periodeId: string, guruId: string, dokumenId: string, status: string, waktuUnggah?: Date) {
  const dg = await prisma.dokumenGuru.create({
    data: {
      periodeId, guruId, dokumenId, status,
      fileId: 'f1', namaFile: 'dok.pdf', tipe: 'application/pdf', ukuran: 10,
      diunggahPada: waktuUnggah ?? new Date(),
    },
  })
  return dg
}

describe('ringkasanDasbor', () => {
  beforeEach(async () => { await bersihkanSemua() })

  it('mengembalikan nol bila tidak ada guru dan tidak ada dokumen', async () => {
    const { periode } = await buatPeriodeDanDokumen('Kosong', 0)
    const r = await ringkasanDasbor(periode.id)
    expect(r.jumlahGuruAktif).toBe(0)
    expect(r.statusGuru).toEqual({ lengkap: 0, perluDicek: 0, adaDitolak: 0, belumMulai: 0 })
    expect(r.totalAntrean).toBe(0)
    expect(r.antrean).toHaveLength(0)
    expect(r.perluPersetujuan).toBe(0)
  })

  it('menghitung guru aktif dan disetujui saja', async () => {
    const { periode } = await buatPeriodeDanDokumen()
    await buatGuru({ aktif: true, disetujui: true })
    await buatGuru({ aktif: false, disetujui: true })   // tidak aktif → tidak masuk
    await buatGuru({ aktif: true, disetujui: false })   // belum disetujui → tidak masuk
    const r = await ringkasanDasbor(periode.id)
    expect(r.jumlahGuruAktif).toBe(1)
  })

  it('menghitung perluPersetujuan dari disetujui=false', async () => {
    const { periode } = await buatPeriodeDanDokumen()
    await buatGuru({ disetujui: false })
    await buatGuru({ disetujui: false })
    await buatGuru({ disetujui: true })
    const r = await ringkasanDasbor(periode.id)
    expect(r.perluPersetujuan).toBe(2)
  })

  it('menggolongkan status guru sesuai hitungStatusGuru', async () => {
    const { periode, daftar } = await buatPeriodeDanDokumen('P', 2)
    const g1 = await buatGuru({ nama: 'Guru Lengkap' })
    const g2 = await buatGuru({ nama: 'Guru Menunggu' })
    const g3 = await buatGuru({ nama: 'Guru Ditolak' })
    const g4 = await buatGuru({ nama: 'Guru Belum' })

    // g1: semua SAH → Lengkap
    await unggahDokumen(periode.id, g1.id, daftar[0].id, 'SAH')
    await unggahDokumen(periode.id, g1.id, daftar[1].id, 'SAH')
    // g2: ada MENUNGGU → Perlu dicek
    await unggahDokumen(periode.id, g2.id, daftar[0].id, 'MENUNGGU')
    // g3: ada DITOLAK → Ada yang ditolak
    await unggahDokumen(periode.id, g3.id, daftar[0].id, 'DITOLAK')
    // g4: tidak ada unggahan → Belum mulai

    const r = await ringkasanDasbor(periode.id)
    expect(r.statusGuru.lengkap).toBe(1)
    expect(r.statusGuru.perluDicek).toBe(1)
    expect(r.statusGuru.adaDitolak).toBe(1)
    expect(r.statusGuru.belumMulai).toBe(1)
  })

  it('antrean hanya berisi DokumenGuru MENUNGGU, diurutkan terlama dulu', async () => {
    const { periode, daftar } = await buatPeriodeDanDokumen()
    const g1 = await buatGuru({ nama: 'Guru Lama' })
    const g2 = await buatGuru({ nama: 'Guru Baru' })

    const waktuLama = new Date('2026-01-01T08:00:00Z')
    const waktuBaru = new Date('2026-01-10T08:00:00Z')
    await unggahDokumen(periode.id, g1.id, daftar[0].id, 'MENUNGGU', waktuLama)
    await unggahDokumen(periode.id, g2.id, daftar[0].id, 'MENUNGGU', waktuBaru)
    // SAH tidak masuk antrean
    await unggahDokumen(periode.id, g2.id, daftar[1].id, 'SAH', waktuBaru)

    const r = await ringkasanDasbor(periode.id)
    expect(r.totalAntrean).toBe(2)
    expect(r.antrean[0].namaGuru).toBe('Guru Lama')
    expect(r.antrean[1].namaGuru).toBe('Guru Baru')
  })

  it('totalAntrean mencakup semua, antrean dibatasi 10', async () => {
    const { periode, daftar } = await buatPeriodeDanDokumen()
    for (let i = 0; i < 12; i++) {
      const g = await buatGuru()
      await unggahDokumen(periode.id, g.id, daftar[0].id, 'MENUNGGU', new Date(Date.now() + i * 1000))
    }
    const r = await ringkasanDasbor(periode.id)
    expect(r.totalAntrean).toBe(12)
    expect(r.antrean).toHaveLength(10)
  })

  it('menghitung perDokumen dengan kolom belum yang benar', async () => {
    const { periode, daftar } = await buatPeriodeDanDokumen()
    const g1 = await buatGuru()
    const g2 = await buatGuru()
    // g1 SAH dok[0]; g2 MENUNGGU dok[0]; dok[1] tidak ada yang unggah
    await unggahDokumen(periode.id, g1.id, daftar[0].id, 'SAH')
    await unggahDokumen(periode.id, g2.id, daftar[0].id, 'MENUNGGU')

    const r = await ringkasanDasbor(periode.id)
    const pd0 = r.perDokumen.find((d) => d.id === daftar[0].id)!
    const pd1 = r.perDokumen.find((d) => d.id === daftar[1].id)!

    expect(pd0.sah).toBe(1)
    expect(pd0.menunggu).toBe(1)
    expect(pd0.ditolak).toBe(0)
    expect(pd0.belum).toBe(0)   // 2 guru - 1 SAH - 1 MENUNGGU = 0

    expect(pd1.sah).toBe(0)
    expect(pd1.menunggu).toBe(0)
    expect(pd1.belum).toBe(2)   // 2 guru belum unggah
  })

  it('dokumen bersyarat hanya dihitung untuk guru yang wajib', async () => {
    const periode = await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
    const dokPns = await prisma.daftarDokumen.create({
      data: { periodeId: periode.id, nama: 'Khusus PNS', urutan: 0, aktif: true, berlakuUntuk: 'pns' },
    })
    const pns = await buatGuru()
    await prisma.guru.update({ where: { id: pns.id }, data: { statusPegawai: 'PNS' } })
    await buatGuru() // bukan PNS: tidak wajib

    const r = await ringkasanDasbor(periode.id)
    expect(r.perDokumen.find((d) => d.id === dokPns.id)!.belum).toBe(1)
  })

  it('aktivitasTerbaru mengembalikan maks 15 baris riwayat terbaru', async () => {
    const admin = await buatAdmin()
    const { periode } = await buatPeriodeDanDokumen()
    for (let i = 0; i < 20; i++) {
      await prisma.riwayat.create({
        data: { periodeId: periode.id, aksi: 'buka_periode', oleh: admin.id, olehTipe: 'admin', waktu: new Date(Date.now() + i * 1000) },
      })
    }
    const r = await ringkasanDasbor(periode.id)
    expect(r.aktivitasTerbaru).toHaveLength(15)
    // terbaru dulu
    expect(r.aktivitasTerbaru[0].waktu.getTime()).toBeGreaterThan(r.aktivitasTerbaru[14].waktu.getTime())
  })

  it('aktivitasTerbaru memuat nama pelaku dengan benar', async () => {
    const admin = await buatAdmin()
    const { periode } = await buatPeriodeDanDokumen()
    await prisma.riwayat.create({
      data: { periodeId: periode.id, aksi: 'buka_periode', oleh: admin.id, olehTipe: 'admin' },
    })
    const r = await ringkasanDasbor(periode.id)
    expect(r.aktivitasTerbaru[0].namaPelaku).toBe('Admin Test')
  })
})
