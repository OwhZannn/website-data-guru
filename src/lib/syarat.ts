import type { Guru } from '@prisma/client'

/** Tugas tambahan yang dicentang guru di halaman dokumen; kunci = nama kolom di tabel Guru. */
export const TUGAS = [
  ['tugasLabPerpus', 'Kepala laboratorium / perpustakaan'],
  ['tugasTbq', 'Jam tambahan TBQ'],
  ['tugasRohis', 'Pembina Rohis'],
  ['tugasImtaq', 'Pembina Imtaq / ekskul'],
  ['tugasInklusi', 'Jam tambahan pembimbing inklusi'],
  ['tugasWakasek', 'Wakil kepala sekolah'],
  ['tugasOsis', 'Pembina OSIS'],
  ['tugasWaliKelas', 'Wali kelas'],
  ['tugasPiket', 'Guru piket'],
  ['tugasGuruWali', 'Guru wali'],
] as const
export type KunciTugas = (typeof TUGAS)[number][0]
export const KUNCI_TUGAS = TUGAS.map(([k]) => k)

/** Untuk siapa sebuah dokumen wajib. Urutan ini juga urutan pilihan di layar admin. */
export const BERLAKU = [
  ['semua', 'Semua guru'],
  ['guru', 'Selain kepala sekolah'],
  ['kepsek', 'Kepala sekolah'],
  ['pns', 'PNS'],
  ['lab_perpus', 'Kepala lab/perpus'],
  ['tbq', 'TBQ'],
  ['rohis', 'Rohis'],
  ['imtaq', 'Imtaq/ekskul'],
  ['inklusi', 'Inklusi'],
  ['wakasek', 'Wakil kepala sekolah'],
  ['osis', 'Pembina OSIS'],
  ['wali_kelas', 'Wali kelas'],
  ['piket', 'Guru piket'],
  ['guru_wali', 'Guru wali'],
  ['sertifikasi_baru', 'Sertifikasi baru'],
] as const
export type Berlaku = (typeof BERLAKU)[number][0]
export const LABEL_BERLAKU: Record<string, string> = Object.fromEntries(BERLAKU)
export const KODE_BERLAKU = BERLAKU.map(([k]) => k) as [Berlaku, ...Berlaku[]]

/** Syarat dokumen yang dipenuhi oleh satu tugas tambahan. */
const SYARAT_TUGAS: Record<string, KunciTugas> = {
  lab_perpus: 'tugasLabPerpus', tbq: 'tugasTbq', rohis: 'tugasRohis', imtaq: 'tugasImtaq', inklusi: 'tugasInklusi',
  wakasek: 'tugasWakasek', osis: 'tugasOsis', wali_kelas: 'tugasWaliKelas', piket: 'tugasPiket', guru_wali: 'tugasGuruWali',
}

export const STATUS_PEGAWAI = [
  ['PNS', 'PNS'],
  ['PPPK', 'PPPK'],
  ['PARUH_WAKTU', 'Paruh waktu'],
  ['NON_ASN', 'Non ASN'],
] as const
export const LABEL_PEGAWAI: Record<string, string> = Object.fromEntries(STATUS_PEGAWAI)
export const KODE_PEGAWAI = STATUS_PEGAWAI.map(([k]) => k) as [string, ...string[]]

export const JABATAN = [
  ['GURU', 'Guru'],
  ['KEPSEK', 'Kepala sekolah'],
] as const
export const LABEL_JABATAN: Record<string, string> = Object.fromEntries(JABATAN)
export const KODE_JABATAN = JABATAN.map(([k]) => k) as [string, ...string[]]

export type ProfilSyarat = Pick<Guru, 'statusPegawai' | 'jabatan' | 'sertifikasiBaru' | KunciTugas>
export type ProfilGuru = ProfilSyarat & Pick<Guru, 'asalSekolah' | 'tahunSertifikasi'> & Partial<Pick<Guru, 'nama' | 'nip' | 'nik' | 'username'>>

/** Apakah dokumen dengan syarat `berlaku` wajib bagi guru dengan profil ini. Syarat tak dikenal = tidak wajib. */
export function wajibBagi(berlaku: string, p: ProfilSyarat): boolean {
  switch (berlaku) {
    case 'semua': return true
    case 'guru': return p.jabatan !== 'KEPSEK'
    case 'kepsek': return p.jabatan === 'KEPSEK'
    case 'pns': return p.statusPegawai === 'PNS'
    case 'sertifikasi_baru': return p.sertifikasiBaru
    default: {
      const tugas = SYARAT_TUGAS[berlaku]
      return tugas ? p[tugas] : false
    }
  }
}

/** Saring daftar dokumen menjadi yang wajib bagi guru ini. */
export function dokumenWajib<T extends { berlakuUntuk: string }>(dokumen: T[], p: ProfilSyarat): T[] {
  return dokumen.filter((d) => wajibBagi(d.berlakuUntuk, p))
}

/** Profil lengkap = asal sekolah, status kepegawaian, dan tahun sertifikasi terisi. */
export function profilLengkap(p: Pick<Guru, 'asalSekolah' | 'statusPegawai' | 'tahunSertifikasi'>): boolean {
  return !!p.asalSekolah?.trim() && !!p.statusPegawai && KODE_PEGAWAI.includes(p.statusPegawai) && !!p.tahunSertifikasi
}

/** Kolom profil yang belum terisi. Setiap entri menyertakan `id` yang cocok dengan atribut id input di FormProfil. */
export function kolomProfilKurang(
  p: Pick<Guru, 'asalSekolah' | 'statusPegawai' | 'tahunSertifikasi'>,
): { kolom: string; label: string; id: string }[] {
  const kurang: { kolom: string; label: string; id: string }[] = []
  if (!p.asalSekolah?.trim()) kurang.push({ kolom: 'asalSekolah', label: 'Asal sekolah', id: 'asal-sekolah' })
  if (!p.statusPegawai || !KODE_PEGAWAI.includes(p.statusPegawai))
    kurang.push({ kolom: 'statusPegawai', label: 'Status kepegawaian', id: 'status-pegawai' })
  if (!p.tahunSertifikasi) kurang.push({ kolom: 'tahunSertifikasi', label: 'Tahun sertifikasi', id: 'tahun-sertifikasi' })
  return kurang
}
