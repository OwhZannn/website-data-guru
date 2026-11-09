# Fase 8 — Tata letak ringkas (informasi muat dalam satu layar)

Epik #35. Melanjutkan Fase 7 (`2026-11-08-fase7-tema-dan-tata-letak-design.md`). Dokumen ini diperbarui tiap tiket:
audit (#24), token kepadatan (#25), `DataTable` (#26), `PageHeader` (#27), satu pemilih periode (#28),
filter langsung (#29), lalu penerapan ke halaman lain (#30–#34).

## 1. Masalah

Banyak halaman harus digulir padahal isinya sedikit, dan sebagian lain menyisakan ruang kosong. Komponen yang sama
muncul berulang (pemilih periode di header dan di halaman). Tabel masih longgar: `th` kapital tebal 0.72rem,
sel berpadding `10px 12px`. Acuan: halaman “Invoice Items” — judul, pencarian bulat, tombol aksi dalam **satu baris**;
tabel di dalam kartu berheader abu muda, isi ±14px, baris ±56px; footer di dalam kartu; kartu mengisi sisa layar.

## 2. Audit kepadatan (#24)

### Cara ukur

Skrip Playwright sekali pakai (di luar repo, tidak di-commit) mengisi data contoh (26 guru × 4 dokumen dengan
status campuran, 2 periode, 3 alasan tolak), menyalakan `next dev -p 3100` dengan `DATABASE_URL=file:./e2e.db DRIVE_PALSU=1`,
masuk lewat `/api/auth/masuk`, lalu untuk tiap halaman memuat, menunggu `networkidle` + font, dan membaca
`document.documentElement.scrollHeight` terhadap `window.innerHeight`, mode terang. “Ruang kosong di bawah” =
`innerHeight` dikurangi tepi bawah elemen terbawah di `<main>`, hanya bila halaman tidak menggulir.
Skrip dijalankan ulang yang sama persis untuk tabel SESUDAH. Ukuran: 1366×768, 1440×900, 375×812.

Halaman: Beranda `/admin`, Guru, Detail guru, Antrean, Periode, Dokumen periode, Admin, Alasan tolak, Akun saya,
Tambah guru, Impor guru; guru: `/dokumen`, `/profil`.

### Hasil SEBELUM (basis Fase 7, sebelum tiket #25–#29)

| Halaman | Layar | Tinggi dokumen | Viewport | Selisih | Ruang kosong di bawah |
|---|---|---:|---:|---:|---:|
| Beranda | 1366×768 | 1295 | 768 | +527 | – |
| Guru | 1366×768 | 1856 | 768 | +1088 | – |
| Detail guru | 1366×768 | 1809 | 768 | +1041 | – |
| Antrean | 1366×768 | 1561 | 768 | +793 | – |
| Periode | 1366×768 | 768 | 768 | 0 | 80 |
| Dokumen periode | 1366×768 | 1131 | 768 | +363 | – |
| Admin | 1366×768 | 768 | 768 | 0 | 304 |
| Alasan tolak | 1366×768 | 768 | 768 | 0 | 238 |
| Akun saya | 1366×768 | 768 | 768 | 0 | 140 |
| Tambah guru | 1366×768 | 852 | 768 | +84 | – |
| Impor guru | 1366×768 | 867 | 768 | +99 | – |
| Beranda | 1440×900 | 1295 | 900 | +395 | – |
| Guru | 1440×900 | 1856 | 900 | +956 | – |
| Detail guru | 1440×900 | 1326 | 900 | +426 | – |
| Antrean | 1440×900 | 1561 | 900 | +661 | – |
| Periode | 1440×900 | 900 | 900 | 0 | 212 |
| Dokumen periode | 1440×900 | 1131 | 900 | +231 | – |
| Admin | 1440×900 | 900 | 900 | 0 | 436 |
| Alasan tolak | 1440×900 | 900 | 900 | 0 | 370 |
| Akun saya | 1440×900 | 900 | 900 | 0 | 272 |
| Tambah guru | 1440×900 | 900 | 900 | 0 | 96 |
| Impor guru | 1440×900 | 900 | 900 | 0 | 98 |
| Beranda | 375×812 | 1763 | 812 | +951 | – |
| Guru | 375×812 | 9125 | 812 | +8313 | – |
| Detail guru | 375×812 | 1266 | 812 | +454 | – |
| Antrean | 375×812 | 2883 | 812 | +2071 | – |
| Periode | 375×812 | 1153 | 812 | +341 | – |
| Dokumen periode | 375×812 | 1717 | 812 | +905 | – |
| Admin | 375×812 | 812 | 812 | 0 | 146 |
| Alasan tolak | 375×812 | 812 | 812 | 0 | 144 |
| Akun saya | 375×812 | 812 | 812 | 0 | 78 |
| Tambah guru | 375×812 | 1135 | 812 | +323 | – |
| Impor guru | 375×812 | 1081 | 812 | +269 | – |
| Guru: Dokumen | 1366×768 | 1073 | 768 | +305 | – |
| Guru: Profil | 1366×768 | 1211 | 768 | +443 | – |
| Guru: Dokumen | 1440×900 | 1073 | 900 | +173 | – |
| Guru: Profil | 1440×900 | 1211 | 900 | +311 | – |
| Guru: Dokumen | 375×812 | 2119 | 812 | +1307 | – |
| Guru: Profil | 375×812 | 1574 | 812 | +762 | – |


### Pelanggar dan penyebab

**A. Menggulir padahal isinya sedikit / tabel tinggi**

| Halaman | Penyebab utama | Diperbaiki oleh |
|---|---|---|
| Guru (+1088 di 1366×768; +8313 di ponsel) | Empat blok sebelum tabel (judul + tombol, pemilih periode, paragraf status, formulir filter), lalu judul `Daftar guru` dan pilihan per halaman; tabel 20 baris tanpa gulir internal; di ponsel tiap baris menjadi kartu tinggi | #25, #26, #27, #28, #29 |
| Antrean (+793; +2071 ponsel) | Pemilih periode ganda, formulir filter berlabel di atas isian, paragraf ringkasan, tabel tanpa gulir internal | #26, #27, #28, #29 |
| Detail guru (+1041) | Pemilih periode ganda, profil dan kartu dokumen berurutan (satu kolom di bawah 1400px) | #28, #31 |
| Beranda (+527) | Judul, breadcrumb, kartu progres, kotak statistik dan dua panel bertumpuk; `main` berpadding bawah 48px | #25, #30 |
| Dokumen periode (+363) | Daftar kartu longgar, formulir tambah, `h1` besar | #25, #32 |
| Tambah/Impor guru (+84/+99) | Formulir dengan kontrol 48px dan margin isian 14px | #25, #33 |
| Guru: Dokumen (+305), Profil (+443) | Judul + pemilih periode ganda + progres + tugas tambahan; formulir panjang berkontrol 48px | #25, #28, #34 |

**B. Tidak menggulir tetapi menyisakan ruang kosong besar**

| Halaman | Ruang kosong (1440×900) | Catatan | Diperbaiki oleh |
|---|---|---|---|
| Admin (daftar admin) | 436px | Daftar pendek, kartu longgar | #32 |
| Alasan tolak | 370px | Daftar pendek | #32 |
| Akun saya | 272px | Formulir kecil | #32 |
| Periode | 212px | Daftar periode pendek | #32 |

**C. Penyebab lintas halaman** (rujukan angka di `globals.css` sebelum Fase 8): `h1` 1.45rem margin 4/12px;
`main` padding `16px 16px 48px`; kontrol `min-height: 48px`; `th, td` padding `10px 12px`; `th` kapital tebal 0.72rem;
`PilihPeriode` ditulis ulang di 4 halaman di samping `PilihPeriodeHeader`.

## 3. Rancangan

### Token kepadatan (#25)

Di `:root` ({`--padat-*`}): `--judul-halaman` 1.35rem, `--judul-jarak` 0 0 8px, `--konten-pad-x` 16px (32px ≥1200px),
`--konten-pad-atas` 12px, `--konten-pad-bawah` 24px, `--jarak-seksi` 16px, `--kontrol-tinggi` 40px,
`--kontrol-tinggi-sentuh` 48px, `--target-min` 24px, `--baris-tabel` 52px. Area admin (`.admin-konten`) memakai
40px; halaman guru tetap 48px di layar sentuh (target utama ≥44px).

### DataTable (#26)

`src/components/ui/DataTable.tsx`, komponen server (tanpa `'use client'`). Properti: `kolom` (id, label, sel, urut?, kelas?),
`baris`, `kunciBaris`, `keterangan` (caption tersembunyi), `paginasi` (hasil `potongHalaman` + pembangun tautan),
`kosong` (EmptyState), `aksiBaris` lewat sel kustom. Kartu `.dt` berukuran `calc(100dvh - header - padding)`,
badan `.dt__gulir` menggulir internal dengan `thead th` sticky; footer `.dt__kaki` berisi pilihan per halaman
(tautan, berfungsi tanpa JS), “Menampilkan x–y dari z”, dan nomor halaman. Di bawah 640px baris menjadi kartu bertumpuk
(`data-label` per sel). Fungsi murni `bangunTautan` / `arahUrut` diuji di `tests/lib/dataTable.test.ts`.

### PageHeader (#27)

`src/components/ui/PageHeader.tsx`: `<h1>` + (opsional) keterangan satu baris + pencarian bulat berikon
(`<form role="search">`, GET) + slot aksi. Satu baris ≥720px; di ponsel judul, pencarian penuh lebar, aksi turun.

### Satu pemilih periode (#28)

`PilihPeriodeHeader` menjadi satu-satunya pemilih admin: menerapkan saat berubah (`router.push` dengan
mempertahankan parameter lain, `hal` dihapus). Tanpa JS: `<noscript>` berisi tombol “Tampilkan”. `PilihPeriode` per halaman
dihapus dari admin; halaman guru `/dokumen` memakai pemilih kompak di header guru.

### Filter langsung (#29)

Komponen klien `FilterOtomatis` membungkus formulir GET: `select`/radio mengirim saat `change`, kolom cari
dikirim setelah jeda 300ms. Tombol kirim tetap ada di `<noscript>`.

## 4. Hasil SESUDAH

_Diisi pada akhir fase (lihat bagian akhir dokumen)._
