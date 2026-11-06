import { randomInt } from 'node:crypto'
import { GalatPengguna } from '@/lib/galat'
import { KODE_JABATAN, KODE_PEGAWAI } from '@/lib/syarat'

/** Status kepegawaian yang memakai NIP. Non ASN memakai NIK. */
export const PAKAI_NIP = new Set(['PNS', 'PPPK', 'PARUH_WAKTU'])
export const pakaiNip = (statusPegawai: string | null | undefined) => PAKAI_NIP.has(statusPegawai ?? '')

/** Teks identitas untuk tampilan: "NIP 1987…" atau "NIK 5201…". */
export function teksIdentitas(g: { username: string; nip: string | null; nik: string | null }): string {
  if (g.nip && g.username === g.nip) return `NIP ${g.nip}`
  if (g.nik && g.username === g.nik) return `NIK ${g.nik}`
  return g.nip ? `NIP ${g.nip}` : g.nik ? `NIK ${g.nik}` : g.username
}

/** Sandi awal guru: 8 angka acak (dari sumber acak kriptografis). */
export function acakSandiAngka(): string {
  let s = ''
  for (let i = 0; i < 8; i++) s += String(randomInt(10))
  return s
}

const hanyaAngka = (v: unknown) => (typeof v === 'string' ? v.replace(/[\s.-]/g, '') : '')

const NAMA_STATUS: Record<string, string> = {
  pns: 'PNS', pppk: 'PPPK', 'paruh waktu': 'PARUH_WAKTU', paruh_waktu: 'PARUH_WAKTU', 'pppk paruh waktu': 'PARUH_WAKTU',
  'non asn': 'NON_ASN', non_asn: 'NON_ASN', nonasn: 'NON_ASN', 'non-asn': 'NON_ASN', honorer: 'NON_ASN',
}
/** Terima kode (PNS, NON_ASN) atau tulisan bebas dari berkas impor ("Paruh waktu", "Non ASN"). */
export function bacaStatusPegawai(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if ((KODE_PEGAWAI as readonly string[]).includes(t)) return t
  return NAMA_STATUS[t.toLowerCase().replace(/\s+/g, ' ')] ?? null
}

export type DataGuruBaru = {
  nama: string
  username: string
  nip: string | null
  nik: string | null
  statusPegawai: string
  jabatan: string
  tahunSertifikasi: number
  asalSekolah: string | null
}

/**
 * Periksa isian guru baru (dari admin, pendaftaran mandiri, atau impor) dan tentukan username-nya:
 * NIP bila ASN, NIK bila Non ASN. Melempar GalatPengguna dengan pesan yang bisa langsung ditampilkan.
 */
export function bacaGuruBaru(m: {
  nama?: unknown; statusPegawai?: unknown; nip?: unknown; nik?: unknown
  jabatan?: unknown; tahunSertifikasi?: unknown; asalSekolah?: unknown
}): DataGuruBaru {
  const nama = typeof m.nama === 'string' ? m.nama.trim().replace(/\s+/g, ' ') : ''
  if (!nama) throw new GalatPengguna('Nama wajib diisi')
  if (nama.length > 200) throw new GalatPengguna('Nama maksimal 200 karakter')

  const statusPegawai = bacaStatusPegawai(m.statusPegawai)
  if (!statusPegawai) throw new GalatPengguna('Pilih status kepegawaian: PNS, PPPK, Paruh waktu, atau Non ASN')

  const nip = hanyaAngka(m.nip) || null
  const nik = hanyaAngka(m.nik) || null
  if (nip !== null && !/^\d{18}$/.test(nip)) throw new GalatPengguna('NIP harus 18 angka')
  if (nik !== null && !/^\d{16}$/.test(nik)) throw new GalatPengguna('NIK harus 16 angka')
  if (pakaiNip(statusPegawai) && !nip) throw new GalatPengguna('NIP wajib diisi untuk PNS, PPPK, dan Paruh waktu')
  if (!pakaiNip(statusPegawai) && !nik) throw new GalatPengguna('NIK wajib diisi untuk Non ASN')

  const jabatanMentah = typeof m.jabatan === 'string' && m.jabatan.trim() ? m.jabatan.trim().toUpperCase() : 'GURU'
  const jabatan = jabatanMentah === 'KEPALA SEKOLAH' ? 'KEPSEK' : jabatanMentah
  if (!(KODE_JABATAN as readonly string[]).includes(jabatan)) throw new GalatPengguna('Jabatan harus Guru atau Kepala sekolah')

  const tahunMentah = typeof m.tahunSertifikasi === 'string' ? m.tahunSertifikasi.trim() : m.tahunSertifikasi
  if (tahunMentah === '' || tahunMentah === undefined || tahunMentah === null) throw new GalatPengguna('Tahun sertifikasi wajib diisi')
  const tahun = Number(tahunMentah)
  if (!Number.isInteger(tahun)) throw new GalatPengguna('Tahun sertifikasi harus berupa angka')
  if (tahun < 1990 || tahun > new Date().getFullYear() + 1) throw new GalatPengguna('Tahun sertifikasi tidak masuk akal')

  const sekolah = typeof m.asalSekolah === 'string' ? m.asalSekolah.trim() : ''
  if (sekolah.length > 200) throw new GalatPengguna('Asal sekolah maksimal 200 karakter')

  return {
    nama, nip, nik, statusPegawai, jabatan, tahunSertifikasi: tahun, asalSekolah: sekolah || null,
    username: (pakaiNip(statusPegawai) ? nip : nik)!,
  }
}
