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

  it('menyimpan tugas tambahan bersama profil dalam satu catatan riwayat', async () => {
    await simpanProfil({ guruId, data: { ...sah, jabatan: 'KEPSEK' }, tugas: { tugasTbq: true, tugasOsis: true }, oleh: adminId, olehTipe: 'admin' })
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g).toMatchObject({ jabatan: 'KEPSEK', tugasTbq: true, tugasOsis: true, tugasRohis: false })
    const riwayat = await prisma.riwayat.findMany({ where: { guruId, aksi: 'ubah_profil' } })
    expect(riwayat).toHaveLength(1)
    expect(riwayat[0].alasan).toContain('jabatan')
    expect(riwayat[0].alasan).toContain('Jam tambahan TBQ: tidak → ya')
  })

  it('tugas yang tidak valid menggagalkan seluruh penyimpanan', async () => {
    await expect(simpanProfil({ guruId, data: sah, tugas: { tugasTbq: 'ya' }, oleh: adminId, olehTipe: 'admin' })).rejects.toThrow()
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })).asalSekolah).toBeNull()
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

  it('guru dan admin dapat mengubah nama lengkap, tercatat di riwayat', async () => {
    await simpanProfil({ guruId, data: { ...sah, nama: 'Siti Rahmawati, M.Pd.' }, oleh: guruId, olehTipe: 'guru' })
    let g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g.nama).toBe('Siti Rahmawati, M.Pd.')
    let r = await prisma.riwayat.findFirstOrThrow({ where: { guruId, aksi: 'ubah_profil' }, orderBy: { waktu: 'desc' } })
    expect(r.alasan).toContain('nama: G → Siti Rahmawati, M.Pd.')

    await simpanProfil({ guruId, data: { ...sah, nama: 'Dr. Siti Rahmawati, M.Pd.' }, oleh: adminId, olehTipe: 'admin' })
    g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g.nama).toBe('Dr. Siti Rahmawati, M.Pd.')
    r = await prisma.riwayat.findFirstOrThrow({ where: { guruId, aksi: 'ubah_profil' }, orderBy: { waktu: 'desc' } })
    expect(r.alasan).toContain('nama: Siti Rahmawati, M.Pd. → Dr. Siti Rahmawati, M.Pd.')
  })

  it('guru tidak bisa mengubah NIP atau NIK sendiri', async () => {
    await simpanProfil({ guruId, data: { ...sah, statusPegawai: 'PNS', nip: '198701012010012001' }, oleh: guruId, olehTipe: 'guru' })
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g.nip).toBe('1')
    expect(g.username).toBe('1')
  })

  it('admin dapat mengubah NIP untuk ASN, memperbarui username dan mencabut sesi guru', async () => {
    // Buat sesi untuk guru
    await prisma.sesi.create({
      data: { token: 'sesi-guru-1', pemilikId: guruId, tipe: 'guru', kedaluwarsa: new Date(Date.now() + 100000) },
    })

    const nipBaru = '198701012010012001'
    await simpanProfil({ guruId, data: { ...sah, statusPegawai: 'PNS', nip: nipBaru }, oleh: adminId, olehTipe: 'admin' })
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g.nip).toBe(nipBaru)
    expect(g.username).toBe(nipBaru)

    // Sesi lama guru harus sudah dihapus
    const sesi = await prisma.sesi.findUnique({ where: { token: 'sesi-guru-1' } })
    expect(sesi).toBeNull()

    const r = await prisma.riwayat.findFirstOrThrow({ where: { guruId, aksi: 'ubah_profil' }, orderBy: { waktu: 'desc' } })
    expect(r.alasan).toContain(`NIP: 1 → ${nipBaru}`)
  })

  it('admin dapat mengubah NIK untuk Non ASN', async () => {
    const nikBaru = '5201014507900001'
    await simpanProfil({ guruId, data: { ...sah, statusPegawai: 'NON_ASN', nik: nikBaru }, oleh: adminId, olehTipe: 'admin' })
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: guruId } })
    expect(g.nik).toBe(nikBaru)
    expect(g.username).toBe(nikBaru)
    expect(g.nip).toBeNull()
  })

  it('menolak NIP/NIK tidak sah dan bentrok dengan guru lain', async () => {
    await expect(
      simpanProfil({ guruId, data: { ...sah, statusPegawai: 'PNS', nip: '123' }, oleh: adminId, olehTipe: 'admin' }),
    ).rejects.toThrow('NIP harus 18 angka')

    await expect(
      simpanProfil({ guruId, data: { ...sah, statusPegawai: 'NON_ASN', nik: '123' }, oleh: adminId, olehTipe: 'admin' }),
    ).rejects.toThrow('NIK harus 16 angka')

    const nipLain = '199001012010012002'
    await prisma.guru.create({ data: { nama: 'Lain', username: nipLain, nip: nipLain, hashSandi: 'x' } })
    await expect(
      simpanProfil({ guruId, data: { ...sah, statusPegawai: 'PNS', nip: nipLain }, oleh: adminId, olehTipe: 'admin' }),
    ).rejects.toThrow('NIP ini sudah terdaftar untuk guru lain')
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
