# Admin dapat mengganti kata sandi sendiri

Tanggal: 2026-11-09

## Tujuan
Admin bisa mengganti kata sandinya sendiri dari panel admin, sama seperti guru di halaman Profil.
Sebelumnya admin hanya bisa direset oleh admin lain (halaman Admin) atau lewat `scripts/buat-admin.mjs`.

## Rancangan
- **Logika bersama** `src/lib/gantiSandi.ts`: `gantiSandi({ tipe, pemilik, sandiLama, sandiBaru, konfirmasi, tokenSekarang })`.
  Urutan pemeriksaan dan pesan sama untuk guru dan admin:
  1. "Kata sandi lama salah"
  2. "Kata sandi baru minimal 8 karakter"
  3. "Konfirmasi kata sandi tidak cocok"

  Bila lolos, hash baru disimpan di tabel `Guru` atau `Admin` sesuai `tipe`, dan semua sesi lain
  milik pemilik itu (dengan `tipe` yang sama) dihapus dalam satu transaksi. Sesi yang sedang dipakai tetap.
- **API guru** `POST /api/ganti-sandi` (`wajibGuru`): perilaku dan bentuk respons tidak berubah.
- **API admin** `POST /api/admin/ganti-sandi` (`wajibAdmin`): body dan respons sama (`{ ok: true }` atau `{ ok: false, pesan }`).
  Sesi guru atau tanpa sesi mendapat 401; sesi admin pada endpoint guru juga 401.
  Tebakan sandi lama dibatasi dengan `pembatas.ts` (kunci `ganti-sandi:admin:<id>`, 5 gagal per 15 menit, lalu 429).
  Hitungan direset setelah berhasil. Endpoint guru tidak dibatasi agar perilakunya tidak berubah.
- **Halaman** `/admin/akun` ("Akun saya"): breadcrumb Beranda / Akun saya, nama dan email (hanya baca),
  dan `FormGantiSandi` dengan prop `endpoint="/api/admin/ganti-sandi"` (bawaan: endpoint guru).
  Dilindungi `halamanAdmin()` dan tampil di dalam AdminShell.
- **Menu profil**: admin mendapat butir "Akun saya" (ke `/admin/akun`) di atas pilihan tema.
  Perilaku papan ketik tidak berubah; butir pertama yang fokus kini "Akun saya".

## Di luar cakupan
- Sandi baru tidak dilarang sama dengan sandi lama (sama seperti guru).
- Reset sandi admin lain tetap lewat halaman Admin; skrip `buat-admin.mjs` tidak berubah.

## Pengujian
- `tests/api/gantiSandiAdmin.test.ts`: validasi, keberhasilan (sesi lain dihapus, sesi sekarang tetap), pemisahan peran guru/admin, pembatas.
- `tests/e2e/akun.spec.ts`: menu Akun saya → ganti sandi → keluar → masuk dengan sandi baru (sandi lama gagal).
