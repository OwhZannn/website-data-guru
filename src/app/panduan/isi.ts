import { DAFTAR_BAKU } from '@/lib/kelolaDokumen'
import { LABEL_BERLAKU } from '@/lib/syarat'

export const DAFTAR_ISI = {
  guru: [
    ['a1', 'Masuk ke aplikasi'],
    ['a2', 'Membuat akun (bila belum punya)'],
    ['a3', 'Melengkapi profil'],
    ['a4', 'Mencentang tugas tambahan'],
    ['a5', 'Mengunggah dokumen'],
    ['a6', 'Dokumen ditolak: mengunggah ulang'],
    ['a7', 'Lulus verval: lanjut ke aplikasi SIAGA'],
    ['a8', 'Khusus kepala sekolah'],
    ['a9', 'Mengganti dan lupa kata sandi'],
  ],
  admin: [
    ['b1', 'Masuk dan beranda admin'],
    ['b2', 'Menyiapkan periode verval'],
    ['b3', 'Menambah akun guru'],
    ['b4', 'Menyetujui pendaftaran guru'],
    ['b5', 'Mencari guru di daftar'],
    ['b6', 'Memeriksa dokumen (verval)'],
    ['b7', 'Mengoreksi profil dan tugas guru'],
    ['b8', 'Atur ulang sandi dan menonaktifkan guru'],
    ['b9', 'Menutup periode dan mengunduh rekap'],
    ['b10', 'Mengelola akun admin dan sandi sendiri'],
  ],
  lampiran: [
    ['l1', 'Daftar dokumen baku dan siapa yang wajib mengunggah'],
    ['l2', 'Arti status dokumen'],
    ['l3', 'Pertanyaan yang sering diajukan'],
  ],
} as const

export const STATUS_DOK = [
  ['Belum diunggah', 'Dokumen belum dikirim.', 'Unggah berkasnya.'],
  ['Menunggu diperiksa', 'Sudah terkirim, menunggu admin.', 'Tunggu. Boleh Ganti file bila ada yang salah.'],
  ['Ditolak', 'Tidak sesuai ketentuan; alasan tertulis di kartu.', 'Perbaiki, lalu Unggah ulang.'],
  ['Sah', 'Sudah diperiksa dan sesuai ketentuan.', 'Tidak perlu apa-apa.'],
] as const

export const FAQ = [
  ['Saya tidak bisa masuk, muncul “Username atau kata sandi salah”.', 'Pastikan username berisi NIP (ASN) atau NIK (Non ASN), bukan email. Tekan ikon mata untuk memeriksa ketikan sandi. Bila tetap gagal, minta admin mengatur ulang sandi.'],
  ['Muncul “Akun Anda sedang menunggu persetujuan admin”.', 'Akun yang Anda buat sendiri belum disetujui. Hubungi admin agar akun Anda segera disetujui.'],
  ['Tombol Unggah tidak muncul.', 'Ada dua kemungkinan: profil belum lengkap (lengkapi di menu Profil), atau masa pengunggahan sedang ditutup oleh admin.'],
  ['Muncul “Ukuran berkas melebihi 3 MB”.', 'Pindai ulang dengan resolusi lebih rendah, atau unggah sebagai foto JPG. Foto otomatis diperkecil oleh aplikasi.'],
  ['Dokumen yang saya butuhkan tidak ada di daftar.', 'Periksa centang tugas tambahan di halaman Dokumen Saya, serta jabatan, status kepegawaian, dan tanda sertifikasi baru di Profil. Daftar dokumen mengikuti isian tersebut.'],
  ['Status saya sudah “lulus verval”, apa selanjutnya?', 'Unggah berkas yang sama ke aplikasi SIAGA, lalu cetak SKMT dan SPTJM dari SIAGA (lihat A7).'],
  ['Apakah berkas saya aman?', 'Berkas disimpan di Google Drive milik pengelola. Hanya admin yang bisa membukanya, dan setiap keputusan admin tercatat di riwayat.'],
] as const

/** Dibuat dari daftar baku di aplikasi supaya lampiran tidak pernah berbeda dari yang dipakai admin. */
export function barisDokumenBaku() {
  return DAFTAR_BAKU.map((d, i) => ({ no: i + 1, nama: d.nama, wajib: LABEL_BERLAKU[d.berlakuUntuk] ?? d.berlakuUntuk }))
}
