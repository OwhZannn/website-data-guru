import { describe, it, expect } from 'vitest'
import { wajibBagi, dokumenWajib, profilLengkap, kolomProfilKurang, type ProfilSyarat } from '../../src/lib/syarat'
import { hitungStatusGuru } from '../../src/lib/status'

const polos: ProfilSyarat = {
  statusPegawai: 'PPPK', jabatan: 'GURU', sertifikasiBaru: false,
  tugasLabPerpus: false, tugasTbq: false, tugasRohis: false, tugasImtaq: false, tugasInklusi: false,
  tugasWakasek: false, tugasOsis: false, tugasWaliKelas: false, tugasPiket: false, tugasGuruWali: false,
}

describe('wajibBagi', () => {
  it('dokumen "semua" wajib bagi siapa pun', () => {
    expect(wajibBagi('semua', polos)).toBe(true)
  })

  it('SK kenaikan pangkat ("pns") hanya wajib bagi PNS', () => {
    expect(wajibBagi('pns', polos)).toBe(false)
    expect(wajibBagi('pns', { ...polos, statusPegawai: 'PNS' })).toBe(true)
    for (const s of ['PPPK', 'PARUH_WAKTU', 'NON_ASN', null]) expect(wajibBagi('pns', { ...polos, statusPegawai: s })).toBe(false)
  })

  it('setiap tugas tambahan membuka dokumennya sendiri saja', () => {
    const pasangan = [
      ['lab_perpus', 'tugasLabPerpus'], ['tbq', 'tugasTbq'], ['rohis', 'tugasRohis'],
      ['imtaq', 'tugasImtaq'], ['inklusi', 'tugasInklusi'], ['sertifikasi_baru', 'sertifikasiBaru'],
      ['wakasek', 'tugasWakasek'], ['osis', 'tugasOsis'], ['wali_kelas', 'tugasWaliKelas'],
      ['piket', 'tugasPiket'], ['guru_wali', 'tugasGuruWali'],
    ] as const
    for (const [syarat, kolom] of pasangan) {
      expect(wajibBagi(syarat, polos)).toBe(false)
      const p = { ...polos, [kolom]: true }
      expect(wajibBagi(syarat, p)).toBe(true)
      for (const [lain] of pasangan) if (lain !== syarat) expect(wajibBagi(lain, p)).toBe(false)
    }
  })

  it('kepala sekolah: dokumen "guru" (jadwal, absen sekolah) diganti dokumen "kepsek"', () => {
    const kepsek = { ...polos, jabatan: 'KEPSEK' }
    expect(wajibBagi('guru', polos)).toBe(true)
    expect(wajibBagi('kepsek', polos)).toBe(false)
    expect(wajibBagi('guru', kepsek)).toBe(false)
    expect(wajibBagi('kepsek', kepsek)).toBe(true)
    expect(wajibBagi('semua', kepsek)).toBe(true)
    expect(wajibBagi('pns', { ...kepsek, statusPegawai: 'PNS' })).toBe(true)
  })

  it('syarat tak dikenal tidak pernah wajib', () => {
    expect(wajibBagi('entah', { ...polos, tugasTbq: true })).toBe(false)
  })
})

describe('dokumenWajib', () => {
  it('menyaring daftar sesuai profil', () => {
    const daftar = [
      { id: 'a', berlakuUntuk: 'semua' }, { id: 'b', berlakuUntuk: 'tbq' }, { id: 'c', berlakuUntuk: 'pns' },
    ]
    expect(dokumenWajib(daftar, polos).map((d) => d.id)).toEqual(['a'])
    expect(dokumenWajib(daftar, { ...polos, tugasTbq: true, statusPegawai: 'PNS' }).map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('profilLengkap', () => {
  const isi = { asalSekolah: 'SMA 1', statusPegawai: 'PNS', tahunSertifikasi: 2015 }
  it('lengkap bila ketiga isian terisi', () => expect(profilLengkap(isi)).toBe(true))
  it('belum lengkap bila salah satu kosong atau status tak dikenal', () => {
    expect(profilLengkap({ ...isi, asalSekolah: '  ' })).toBe(false)
    expect(profilLengkap({ ...isi, statusPegawai: null })).toBe(false)
    expect(profilLengkap({ ...isi, statusPegawai: 'HONORER' })).toBe(false)
    expect(profilLengkap({ ...isi, tahunSertifikasi: null })).toBe(false)
  })
})

describe('hitungStatusGuru dengan profil', () => {
  const daftar = [
    { id: 'umum', aktif: true, berlakuUntuk: 'semua' },
    { id: 'tbq', aktif: true, berlakuUntuk: 'tbq' },
    { id: 'pangkat', aktif: true, berlakuUntuk: 'pns' },
  ]
  it('hanya menghitung dokumen yang wajib bagi guru itu', () => {
    const h = hitungStatusGuru(daftar, [{ dokumenId: 'umum', status: 'SAH' }], polos)
    expect(h).toMatchObject({ jumlahWajib: 1, jumlahSah: 1, lengkap: true, label: 'Lengkap' })
  })

  it('tugas yang dicabut membuat unggahan lamanya tidak dihitung, termasuk yang ditolak', () => {
    const baris = [{ dokumenId: 'umum', status: 'SAH' }, { dokumenId: 'tbq', status: 'DITOLAK' }]
    expect(hitungStatusGuru(daftar, baris, { ...polos, tugasTbq: true })).toMatchObject({ lengkap: false, label: 'Ada yang ditolak' })
    expect(hitungStatusGuru(daftar, baris, polos)).toMatchObject({ lengkap: true, adaDitolak: false, label: 'Lengkap' })
  })

  it('tanpa profil, semua dokumen aktif dihitung seperti sebelumnya', () => {
    expect(hitungStatusGuru(daftar, []).jumlahWajib).toBe(3)
  })
})

describe('kolomProfilKurang', () => {
  it('mengembalikan tiga kolom ketika semua kosong', () => {
    const hasil = kolomProfilKurang({ asalSekolah: null, statusPegawai: null, tahunSertifikasi: null })
    expect(hasil).toHaveLength(3)
    expect(hasil.map((x) => x.kolom)).toEqual(['asalSekolah', 'statusPegawai', 'tahunSertifikasi'])
    expect(hasil.map((x) => x.id)).toEqual(['asal-sekolah', 'status-pegawai', 'tahun-sertifikasi'])
  })

  it('tidak mengembalikan apa pun ketika profil lengkap', () => {
    const hasil = kolomProfilKurang({ asalSekolah: 'SMA 1', statusPegawai: 'PNS', tahunSertifikasi: 2015 })
    expect(hasil).toHaveLength(0)
  })

  it('hanya melaporkan kolom yang benar-benar kosong', () => {
    const hanya_sekolah = kolomProfilKurang({ asalSekolah: null, statusPegawai: 'PPPK', tahunSertifikasi: 2020 })
    expect(hanya_sekolah).toHaveLength(1)
    expect(hanya_sekolah[0].kolom).toBe('asalSekolah')

    const hanya_status = kolomProfilKurang({ asalSekolah: 'MAN 1', statusPegawai: null, tahunSertifikasi: 2018 })
    expect(hanya_status).toHaveLength(1)
    expect(hanya_status[0].kolom).toBe('statusPegawai')

    const hanya_tahun = kolomProfilKurang({ asalSekolah: 'MAN 1', statusPegawai: 'NON_ASN', tahunSertifikasi: null })
    expect(hanya_tahun).toHaveLength(1)
    expect(hanya_tahun[0].kolom).toBe('tahunSertifikasi')
  })

  it('asal sekolah hanya spasi dianggap kosong', () => {
    const hasil = kolomProfilKurang({ asalSekolah: '   ', statusPegawai: 'PNS', tahunSertifikasi: 2015 })
    expect(hasil).toHaveLength(1)
    expect(hasil[0].kolom).toBe('asalSekolah')
  })

  it('status pegawai tidak valid dianggap kosong', () => {
    const hasil = kolomProfilKurang({ asalSekolah: 'SMA 1', statusPegawai: 'TIDAK_VALID', tahunSertifikasi: 2015 })
    expect(hasil).toHaveLength(1)
    expect(hasil[0].kolom).toBe('statusPegawai')
  })
})
