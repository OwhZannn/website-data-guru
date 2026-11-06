# Tampilan "Bersih Modern" — Rancangan

Tanggal: 2026-11-06 · Status: menunggu persetujuan

## Tujuan
Memberi seluruh website (masuk, guru, admin) satu gaya visual: gaya B "Bersih Modern" dari mockup pilihan. Hanya tampilan yang berubah. Alur, aturan, API, dan basis data tetap sama.

## Identitas
- Logo: lambang resmi Kementerian Agama dari Wikimedia Commons (`Kementerian_Agama_new_logo.png`, 708×635), disimpan di `public/logo-kemenag.png`, dipasang apa adanya tanpa diubah warna atau bentuknya.
- Warna diambil dari logo:
  - hijau utama `#006316` (hijau logo), hijau terang `#0f7a45` untuk tombol dan gradasi
  - emas `#f0bf01` hanya untuk aksen kecil (garis aktif, sorotan), tidak untuk teks
- Status tetap pakai warna semantik dari mockup: SAH hijau, DITOLAK merah, MENUNGGU kuning, BELUM abu.
- Huruf: Plus Jakarta Sans (dimuat lewat `next/font`, jadi di-host sendiri, tanpa panggilan ke Google saat dipakai), cadangan `system-ui`.

## Pendekatan teknis
- Satu berkas CSS global (`src/app/globals.css`) berisi token warna, jarak, dan komponen dasar (kartu, tombol, label status, tabel, formulir). Tanpa Tailwind atau pustaka UI baru.
- Komponen kecil bersama di `src/components/`: `Kepala` (logo + judul + nama pengguna + tombol keluar), `LabelStatus`, `CincinProgres`.
- Halaman yang ada hanya diganti markup dan kelasnya; logika dan pemanggilan API tidak disentuh.
- Tema terang saja untuk versi pertama (aplikasi kantor, dipakai siang hari). Mode gelap bisa ditambah nanti.

## Halaman
| Halaman | Perubahan |
|---|---|
| `/masuk` | Kartu di tengah, logo besar di atas, judul "Verval Sertifikasi Guru" |
| `/dokumen` (guru) | Kepala putih + logo, kartu gradasi hijau dengan cincin progres "x/y sah", satu kartu per dokumen dengan ikon status; dokumen DITOLAK paling atas dengan alasan dan tombol "Perbaiki" |
| `/ganti-sandi` | Kartu formulir dengan gaya yang sama |
| `/admin` (daftar guru) | Empat kotak ringkasan (Lengkap, Perlu dicek, Ada ditolak, Belum mulai) lalu tabel dengan pencarian dan saringan |
| `/admin/guru/[id]` | Kartu per dokumen dengan tombol Sahkan / Tolak / Batalkan, riwayat di bawah |
| `/admin/periode`, `/admin/periode/[id]/dokumen`, `/admin/admin` | Tabel dan formulir dengan gaya yang sama |

Navigasi admin: baris tab di bawah kepala (Daftar guru · Periode · Admin), bukan menu samping, supaya tetap muat di layar sempit.

## Yang tidak berubah
Skema Prisma, rute API, aturan verval, alur unggah, teks pesan galat.

## Pengujian
- Tes Playwright yang ada harus tetap lulus. Kalau ada pemilih (selector) yang bergantung pada teks atau struktur lama, tesnya disesuaikan, bukan dihapus.
- `vitest`, `tsc`, dan `next build` tetap hijau.
- Pemeriksaan visual: tangkapan layar halaman guru di lebar 360px dan halaman admin di 1280px.

## Catatan lisensi logo
Berkas di Wikimedia Commons berstatus lambang instansi pemerintah. Pemakaian untuk aplikasi internal madrasah/Kemenag sendiri wajar, tapi sebaiknya dikonfirmasi ke kantor Anda kalau website ini nanti dibuka untuk umum.
