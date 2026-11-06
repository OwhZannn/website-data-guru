import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { simpanProfil, simpanTugas } from '../../src/lib/profil'
import { isiDaftarBaku, tambahDokumen, hitungDampakDokumenBaru, DAFTAR_BAKU } from '../../src/lib/kelolaDokumen'

const sah = { asalSekolah: 'SMA Negeri 1', statusPegawai: 'PPPK', tahunSertifikasi: 2018 }

describe('simpanProfil', () => {
  let guruId: string, adminId: string, periodeId: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    guruId = (await prisma.guru.create({ data: { nama: 'G', username: '1', nip: '1', email: 'g@x.id', hashSandi: 'x' } })).id
    periodeId = (await prisma.periode.create({ data: { nama: 'P', dibuka: true } })).id
  })

  it('menyimpan profil dan mencatat perubahan di riwayat periode yang dibuka', async () => {
    await simpanProfil({ guruId, data: { ...sah, jabatan: 'KEPSEK' }, oleh: guruId, olehTipe: 'guru' })
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g).toMatchObject({ ...sah, jabatan: 'KEPSEK', sertifikasiBaru: false })
    const r = await prisma.riwayat.findFirstOrThrow({ where: { guruId, aksi: 'ubah_profil' } })
    expect(r).toMatchObject({ periodeId, olehTipe: 'guru' })
    expect(r.alasan).toContain('status kepegawaian: - → PPPK')
    expect(r.alasan).toContain('jabatan: Guru → Kepala sekolah')
  })

  it('koreksi admin dicatat atas nama admin; simpan tanpa perubahan tidak mencatat apa pun', async () => {
    await simpanProfil({ guruId, data: sah, oleh: guruId, olehTipe: 'guru' })
    expect(await simpanProfil({ guruId, data: sah, oleh: adminId, olehTipe: 'admin' })).toEqual({ berubah: false })
    await simpanProfil({ guruId, data: { ...sah, statusPegawai: 'PNS' }, oleh: adminId, olehTipe: 'admin' })
    const r = await prisma.riwayat.findMany({ where: { guruId, aksi: 'ubah_profil' }, orderBy: { waktu: 'asc' } })
    expect(r).toHaveLength(2)
    expect(r[1]).toMatchObject({ oleh: adminId, olehTipe: 'admin', alasan: 'status kepegawaian: PPPK → PNS' })
  })

  it('menolak isian tidak sah dengan pesan yang jelas', async () => {
    const coba = (d: object) => simpanProfil({ guruId, data: { ...sah, ...d }, oleh: guruId, olehTipe: 'guru' })
    await expect(coba({ asalSekolah: '   ' })).rejects.toThrow('Asal sekolah wajib diisi')
    await expect(coba({ statusPegawai: 'HONORER' })).rejects.toThrow('Pilih status kepegawaian')
    await expect(coba({ tahunSertifikasi: 'dua ribu' })).rejects.toThrow('Tahun sertifikasi harus berupa angka')
    await expect(coba({ tahunSertifikasi: 1900 })).rejects.toThrow('Tahun sertifikasi tidak masuk akal')
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })).asalSekolah).toBeNull()
  })

  it('menyimpan profil tidak menghapus centang tugas tambahan', async () => {
    await simpanTugas({ guruId, data: { tugasTbq: true }, oleh: guruId, olehTipe: 'guru' })
    await simpanProfil({ guruId, data: sah, oleh: guruId, olehTipe: 'guru' })
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })).tugasTbq).toBe(true)
  })

  it('jabatan tak dikenal ditolak; tanpa jabatan dianggap guru', async () => {
    await expect(simpanProfil({ guruId, data: { ...sah, jabatan: 'BOS' }, oleh: guruId, olehTipe: 'guru' })).rejects.toThrow('Pilih jabatan')
    await simpanProfil({ guruId, data: sah, oleh: guruId, olehTipe: 'guru' })
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })).jabatan).toBe('GURU')
  })

  it('tetap tersimpan walau belum ada periode', async () => {
    await prisma.periode.deleteMany()
    await simpanProfil({ guruId, data: sah, oleh: guruId, olehTipe: 'guru' })
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })).asalSekolah).toBe('SMA Negeri 1')
  })
})

describe('simpanTugas', () => {
  let guruId: string

  beforeEach(async () => {
    await bersihkanSemua()
    guruId = (await prisma.guru.create({ data: { nama: 'G', username: '1', nip: '1', email: 'g@x.id', hashSandi: 'x' } })).id
    await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
  })

  it('hanya mengubah tugas yang dikirim dan mencatatnya', async () => {
    await simpanTugas({ guruId, data: { tugasTbq: true, tugasWaliKelas: true }, oleh: guruId, olehTipe: 'guru' })
    await simpanTugas({ guruId, data: { tugasTbq: false }, oleh: guruId, olehTipe: 'guru' })
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g).toMatchObject({ tugasTbq: false, tugasWaliKelas: true, tugasOsis: false })
    const r = await prisma.riwayat.findMany({ where: { guruId, aksi: 'ubah_profil' }, orderBy: { waktu: 'asc' } })
    expect(r.map((x) => x.alasan)).toEqual(['Jam tambahan TBQ: tidak → ya; Wali kelas: tidak → ya', 'Jam tambahan TBQ: ya → tidak'])
  })

  it('menolak kunci yang bukan tugas tambahan', async () => {
    await expect(simpanTugas({ guruId, data: { asalSekolah: 'X' }, oleh: guruId, olehTipe: 'guru' })).rejects.toThrow()
    await expect(simpanTugas({ guruId, data: { tugasTbq: 'ya' }, oleh: guruId, olehTipe: 'guru' })).rejects.toThrow()
  })
})

describe('daftar baku dan dokumen bersyarat', () => {
  let adminId: string, periodeId: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    periodeId = (await prisma.periode.create({ data: { nama: 'P', dibuka: true } })).id
  })

  it('mengisi 24 dokumen baku: SK pangkat khusus PNS, jadwal/absen sekolah diganti dokumen kepala sekolah', async () => {
    expect(await isiDaftarBaku({ periodeId, adminId })).toEqual({ jumlah: 24 })
    const d = await prisma.daftarDokumen.findMany({ where: { periodeId }, orderBy: { urutan: 'asc' } })
    expect(d.map((x) => x.nama)).toEqual(DAFTAR_BAKU.map((x) => x.nama))
    expect(d.find((x) => x.nama === 'SK kenaikan pangkat terakhir')?.berlakuUntuk).toBe('pns')
    expect(d.filter((x) => x.berlakuUntuk === 'sertifikasi_baru')).toHaveLength(4)
    expect(d.filter((x) => x.berlakuUntuk === 'guru').map((x) => x.nama)).toEqual([
      'Jadwal dan tugas guru PAI dari sekolah',
      'Jadwal dan tugas dari aplikasi SIAGA (distempel dan ditandatangani kepala sekolah)',
      'Absen dari sekolah',
    ])
    expect(d.filter((x) => x.berlakuUntuk === 'kepsek').map((x) => x.nama)).toEqual([
      'SK sebagai kepala sekolah', 'Program kepala sekolah', 'Absen dari aplikasi SIAGA',
    ])
    for (const k of ['wakasek', 'osis', 'wali_kelas', 'piket', 'guru_wali']) {
      expect(d.filter((x) => x.berlakuUntuk === k).map((x) => x.nama)).toEqual([expect.stringMatching(/^Laporan /)])
    }
  })

  it('menolak daftar baku bila periode sudah punya dokumen', async () => {
    await tambahDokumen({ periodeId, nama: 'Lain', adminId })
    await expect(isiDaftarBaku({ periodeId, adminId })).rejects.toThrow('belum punya dokumen')
  })

  it('menolak pilihan "berlaku untuk" yang tidak dikenal', async () => {
    await expect(tambahDokumen({ periodeId, nama: 'X', berlakuUntuk: 'honorer', adminId })).rejects.toThrow('tidak sah')
  })

  it('dampak dokumen bersyarat hanya menghitung guru lengkap yang terkena syaratnya', async () => {
    const umum = (await prisma.daftarDokumen.create({ data: { periodeId, nama: 'Umum', urutan: 1 } })).id
    const buat = (nip: string, tugasTbq: boolean) =>
      prisma.guru.create({ data: { nama: nip, username: nip, nip, email: `${nip}@x.id`, hashSandi: 'x', ...sah, tugasTbq } })
    for (const g of [await buat('1', true), await buat('2', false)]) {
      await prisma.dokumenGuru.create({ data: { periodeId, guruId: g.id, dokumenId: umum, status: 'SAH' } })
    }
    expect(await hitungDampakDokumenBaru(periodeId, undefined, 'semua')).toBe(2)
    expect(await hitungDampakDokumenBaru(periodeId, undefined, 'tbq')).toBe(1)
    expect(await hitungDampakDokumenBaru(periodeId, undefined, 'rohis')).toBe(0)
  })
})
