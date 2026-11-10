/** Teks placeholder dan bantuan kolom isian guru; dipakai bersama oleh Daftar, Tambah guru, dan Profil agar seragam. */
export const PETUNJUK = {
  nama: {
    contoh: 'Contoh: Siti Rahmawati, S.Pd.I.',
    bantuan: 'Tulis lengkap beserta gelar, sesuai SK.',
  },
  statusPegawai: {
    bantuan: 'Pilihan: PNS, PPPK, Paruh waktu, atau Non ASN.',
  },
  nip: {
    contoh: 'Contoh: 198701012010012001',
    bantuan: '18 angka NIP (tanpa spasi/titik), digunakan sebagai username masuk.',
  },
  nik: {
    contoh: 'Contoh: 5201014507900001',
    bantuan: '16 angka sesuai KTP, digunakan sebagai username masuk.',
  },
  jabatan: {
    bantuan: 'Kepala sekolah mengunggah SK dan program kepala sekolah, bukan jadwal dan absen.',
  },
  tahunSertifikasi: {
    contoh: 'Contoh: 2015',
    bantuan: 'Tahun sertifikat pendidik terbit (rentang 1990 s.d. tahun sekarang).',
  },
  asalSekolah: {
    contoh: 'Contoh: MAN 1 Mataram',
    bantuan: 'Nama madrasah atau sekolah tempat mengajar.',
  },
} as const

/** Bantuan di bawah pasangan status dan NIP/NIK; berubah menurut status yang dipilih. */
export function bantuanIdentitas(status: string, nonAsn: boolean): string {
  if (status === '') return 'Pilih status kepegawaian dulu; kolom NIP atau NIK menyesuaikan.'
  return nonAsn
    ? 'Non ASN masuk memakai NIK sebagai username (16 angka sesuai KTP).'
    : 'PNS, PPPK, dan Paruh waktu masuk memakai NIP sebagai username (18 angka).'
}
