import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { imporGuru, uraiDaftarGuru, acakSandiAwal, type BarisGuru } from '../../src/lib/imporGuru'
import { acakSandiAngka, bacaGuruBaru } from '../../src/lib/identitas'
import { periksaSandi } from '../../src/lib/sandi'
import * as riwayat from '../../src/lib/riwayat'
import {
  aturAktifGuru, aturUlangSandiGuru, buatAkunGuru, setujuiGuru, tolakPendaftaran,
} from '../../src/lib/kelolaGuru'

const NIP = (n: number) => `1987010120100120${String(n).padStart(2, '0')}` // 18 angka
const NIK = (n: number) => `52010145079000${String(n).padStart(2, '0')}` // 16 angka
const pns = (nama: string, n: number): BarisGuru => ({ nama, nip: NIP(n), nik: '', status: 'PNS', tahun: '2015' })

describe('uraiDaftarGuru', () => {
  it('nama;nip;nik;status;tahun, pemisah per baris, melewati kosong dan header', () => {
    const h = uraiDaftarGuru(`Nama;NIP;NIK;Status Kepegawaian;Tahun Sertifikasi\n\nSiti;${NIP(1)};;PNS;2014\r\nNur, , ${NIK(1)} , Non ASN, 2021\n`)
    expect(h).toEqual([
      { nama: 'Siti', nip: NIP(1), nik: '', status: 'PNS', tahun: '2014' },
      { nama: 'Nur', nip: '', nik: NIK(1), status: 'Non ASN', tahun: '2021' },
    ])
  })
  it('baris kurang kolom tetap dikembalikan agar ditolak saat validasi', () => {
    expect(uraiDaftarGuru('Siti;123')).toEqual([{ nama: 'Siti', nip: '123', nik: '', status: '', tahun: '' }])
  })
})

describe('sandi acak', () => {
  it('sandi guru: tepat 8 angka', () => {
    const s = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const p = acakSandiAngka()
      expect(p).toMatch(/^\d{8}$/)
      s.add(p)
    }
    expect(s.size).toBeGreaterThan(490)
  })
  it('sandi admin tetap 10 karakter tanpa karakter ambigu', () => {
    for (let i = 0; i < 200; i++) expect(acakSandiAwal()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{10}$/)
  })
})

describe('bacaGuruBaru', () => {
  const dasar = { nama: 'Siti', statusPegawai: 'PNS', nip: NIP(1), tahunSertifikasi: '2015' }
  it('ASN memakai NIP sebagai username; Non ASN memakai NIK', () => {
    expect(bacaGuruBaru(dasar)).toMatchObject({ username: NIP(1), nip: NIP(1), nik: null, jabatan: 'GURU', tahunSertifikasi: 2015 })
    for (const s of ['PPPK', 'Paruh waktu', 'PARUH_WAKTU']) expect(bacaGuruBaru({ ...dasar, statusPegawai: s }).username).toBe(NIP(1))
    expect(bacaGuruBaru({ nama: 'Nur', statusPegawai: 'Non ASN', nik: NIK(1), tahunSertifikasi: 2021 }))
      .toMatchObject({ username: NIK(1), nip: null, nik: NIK(1), statusPegawai: 'NON_ASN' })
  })
  it('spasi dan titik pada NIP/NIK diabaikan; jabatan kepala sekolah diterima', () => {
    expect(bacaGuruBaru({ ...dasar, nip: '19870101 201001 2 001', jabatan: 'Kepala sekolah' }))
      .toMatchObject({ nip: '198701012010012001', jabatan: 'KEPSEK' })
  })
  it('menolak dengan pesan yang jelas', () => {
    expect(() => bacaGuruBaru({ ...dasar, nama: ' ' })).toThrow('Nama wajib diisi')
    expect(() => bacaGuruBaru({ ...dasar, statusPegawai: 'Guru tamu' })).toThrow('Pilih status kepegawaian')
    expect(() => bacaGuruBaru({ ...dasar, nip: '' })).toThrow('NIP wajib diisi untuk PNS, PPPK, dan Paruh waktu')
    expect(() => bacaGuruBaru({ ...dasar, nip: '123' })).toThrow('NIP harus 18 angka')
    expect(() => bacaGuruBaru({ ...dasar, statusPegawai: 'Non ASN', nip: '' })).toThrow('NIK wajib diisi untuk Non ASN')
    expect(() => bacaGuruBaru({ ...dasar, statusPegawai: 'Non ASN', nik: '12' })).toThrow('NIK harus 16 angka')
    expect(() => bacaGuruBaru({ ...dasar, tahunSertifikasi: 'dulu' })).toThrow('Tahun sertifikasi harus berupa angka')
    expect(() => bacaGuruBaru({ ...dasar, tahunSertifikasi: 1950 })).toThrow('Tahun sertifikasi tidak masuk akal')
    expect(() => bacaGuruBaru({ ...dasar, jabatan: 'Bos' })).toThrow('Jabatan harus Guru atau Kepala sekolah')
  })
})

describe('imporGuru', () => {
  let adminId: string

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
  })

  it('membuat akun ASN (NIP) dan Non ASN (NIK); sandi 8 angka bisa dipakai', async () => {
    const h = await imporGuru({
      baris: [{ ...pns(' Siti ', 1), status: 'PPPK' }, { nama: 'Nur', nip: '', nik: NIK(1), status: 'non asn', tahun: '2021' }],
      adminId,
    })
    expect(h.dibuat).toBe(2)
    expect(h.sandiAwal.map((s) => s.username)).toEqual([NIP(1), NIK(1)])
    const siti = await prisma.guru.findUniqueOrThrow({ where: { username: NIP(1) } })
    expect(siti).toMatchObject({ nama: 'Siti', nip: NIP(1), nik: null, statusPegawai: 'PPPK', tahunSertifikasi: 2015, disetujui: true })
    expect(h.sandiAwal[0].sandi).toMatch(/^\d{8}$/)
    expect(await periksaSandi(h.sandiAwal[0].sandi, siti.hashSandi)).toBe(true)
    expect(await prisma.guru.findUniqueOrThrow({ where: { username: NIK(1) } })).toMatchObject({ statusPegawai: 'NON_ASN', nip: null })
  })

  it('melewati yang sudah ada tanpa mengubahnya', async () => {
    await imporGuru({ baris: [pns('Siti', 1)], adminId })
    const h = await imporGuru({ baris: [pns('Lain', 1)], adminId })
    expect(h).toMatchObject({ dibuat: 0, dilewati: 1, sandiAwal: [] })
    expect((await prisma.guru.findUniqueOrThrow({ where: { username: NIP(1) } })).nama).toBe('Siti')
  })

  it('menolak baris tidak valid dan ganda dalam daftar', async () => {
    const h = await imporGuru({
      baris: [
        pns('A', 1),
        pns('', 2),
        { ...pns('C', 3), nip: 'abc' },
        { ...pns('D', 4), status: 'Non ASN' },
        pns('E', 1),
        { ...pns('F', 6), tahun: '' },
      ],
      adminId,
    })
    expect(h.dibuat).toBe(1)
    expect(h.ditolak).toEqual([
      { baris: 2, alasan: 'Nama wajib diisi' },
      { baris: 3, alasan: 'NIP harus 18 angka' },
      { baris: 4, alasan: 'NIK wajib diisi untuk Non ASN' },
      { baris: 5, alasan: 'NIP atau NIK ganda dalam daftar' },
      { baris: 6, alasan: 'Tahun sertifikasi wajib diisi' },
    ])
    expect(await prisma.guru.count()).toBe(1)
  })

  it('gagal mencatat riwayat tidak menghilangkan sandi', async () => {
    const spy = vi.spyOn(riwayat, 'catatRiwayat').mockRejectedValueOnce(new Error('db'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const h = await imporGuru({ baris: [pns('A', 1)], adminId })
    spy.mockRestore(); err.mockRestore()
    expect(h.dibuat).toBe(1)
    expect(h.sandiAwal).toHaveLength(1)
  })

  it('menolak lebih dari 500 baris', async () => {
    const baris = Array.from({ length: 501 }, (_, i) => pns('G', i % 99))
    await expect(imporGuru({ baris, adminId })).rejects.toThrow('Maksimal 500 baris per impor')
  })

  it('batch yang bentrok tidak menghentikan impor; sandi dan riwayat tetap ada', async () => {
    const asli = prisma.guru.createMany.bind(prisma.guru)
    const spy = vi.spyOn(prisma.guru, 'createMany').mockImplementationOnce((async (a: never) => {
      await prisma.guru.create({ data: { nama: 'Bentrok', username: NIP(2), nip: NIP(2), hashSandi: 'x' } })
      return asli(a)
    }) as never)
    const h = await imporGuru({ baris: [1, 2, 3].map((n) => pns(`G${n}`, n)), adminId })
    spy.mockRestore()
    expect(h).toMatchObject({ dibuat: 2, dilewati: 1, ditolak: [] })
    expect(h.sandiAwal.map((s) => s.username).sort()).toEqual([NIP(1), NIP(3)])
    expect((await prisma.guru.findUniqueOrThrow({ where: { username: NIP(2) } })).nama).toBe('Bentrok')
    const r = await prisma.riwayat.findMany({ where: { aksi: 'impor_guru' } })
    expect(r.map((x) => x.alasan)).toEqual(['Impor: 2 dibuat, 1 dilewati, 0 ditolak'])
  })

  it('mencatat satu riwayat ringkasan', async () => {
    await imporGuru({ baris: [pns('A', 1), pns('', 2)], adminId })
    const r = await prisma.riwayat.findMany({ where: { aksi: 'impor_guru' } })
    expect(r).toHaveLength(1)
    expect(r[0].alasan).toBe('Impor: 1 dibuat, 0 dilewati, 1 ditolak')
  })
})

describe('kelola akun guru', () => {
  let adminId: string
  const isian = { nama: 'Siti', statusPegawai: 'PNS', nip: NIP(1), tahunSertifikasi: '2015', jabatan: 'GURU' }

  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
  })

  it('admin menambah guru: langsung disetujui, username NIP, sandi 8 angka', async () => {
    const a = await buatAkunGuru({ data: isian, disetujui: true, oleh: adminId })
    expect(a).toMatchObject({ username: NIP(1), jenis: 'NIP' })
    expect(a.sandi).toMatch(/^\d{8}$/)
    const g = await prisma.guru.findUniqueOrThrow({ where: { id: a.id } })
    expect(g.disetujui).toBe(true)
    expect(await periksaSandi(a.sandi, g.hashSandi)).toBe(true)
    expect((await prisma.riwayat.findFirstOrThrow({ where: { aksi: 'tambah_guru' } })).oleh).toBe(adminId)
  })

  it('pendaftaran mandiri Non ASN: username NIK, menunggu persetujuan, lalu disetujui', async () => {
    const a = await buatAkunGuru({ data: { ...isian, statusPegawai: 'NON_ASN', nip: '', nik: NIK(1) }, disetujui: false })
    expect(a).toMatchObject({ username: NIK(1), jenis: 'NIK' })
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: a.id } })).disetujui).toBe(false)
    await setujuiGuru(a.id, adminId)
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: a.id } })).disetujui).toBe(true)
    expect(await prisma.riwayat.count({ where: { aksi: { in: ['daftar_guru', 'setujui_guru'] } } })).toBe(2)
  })

  it('NIP/NIK yang sudah terdaftar ditolak, termasuk bila tercatat sebagai NIK guru lain', async () => {
    await buatAkunGuru({ data: isian, disetujui: true, oleh: adminId })
    await expect(buatAkunGuru({ data: isian, disetujui: false })).rejects.toThrow('NIP ini sudah terdaftar')
    await prisma.guru.create({ data: { nama: 'X', username: 'x', nik: NIK(2), hashSandi: 'x' } })
    await expect(buatAkunGuru({ data: { ...isian, statusPegawai: 'NON_ASN', nip: '', nik: NIK(2) }, disetujui: false })).rejects.toThrow('NIK ini sudah terdaftar')
  })

  it('tolak pendaftaran menghapus akun yang belum disetujui saja', async () => {
    const a = await buatAkunGuru({ data: isian, disetujui: false })
    await tolakPendaftaran(a.id, adminId)
    expect(await prisma.guru.count()).toBe(0)
    const b = await buatAkunGuru({ data: isian, disetujui: true, oleh: adminId })
    await expect(tolakPendaftaran(b.id, adminId)).rejects.toThrow('sudah disetujui')
  })

  it('atur ulang sandi (8 angka) dan nonaktifkan menghapus sesi', async () => {
    const a = await buatAkunGuru({ data: isian, disetujui: true, oleh: adminId })
    await prisma.sesi.create({ data: { token: 't1', pemilikId: a.id, tipe: 'guru', kedaluwarsa: new Date(Date.now() + 1e6) } })
    const { sandi, username } = await aturUlangSandiGuru(a.id)
    expect(sandi).toMatch(/^\d{8}$/)
    expect(username).toBe(NIP(1))
    expect(await prisma.sesi.count()).toBe(0)
    expect(await periksaSandi(sandi, (await prisma.guru.findUniqueOrThrow({ where: { id: a.id } })).hashSandi)).toBe(true)
    await prisma.sesi.create({ data: { token: 't2', pemilikId: a.id, tipe: 'guru', kedaluwarsa: new Date(Date.now() + 1e6) } })
    await aturAktifGuru(a.id, false)
    expect(await prisma.sesi.count()).toBe(0)
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: a.id } })).aktif).toBe(false)
  })
})
