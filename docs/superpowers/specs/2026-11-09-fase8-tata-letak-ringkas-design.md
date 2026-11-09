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

## 3. Rancangan dan realisasi

### Token kepadatan (#25) — `globals.css`

Di `:root`: `--judul-halaman` 1.35rem, `--judul-margin` `0 0 8px`, `--konten-pad-atas` 12px, `--konten-pad-bawah` 24px
(sebelumnya 48px), `--konten-pad-x` 16px (32px ≥1200px), `--jarak-seksi` 16px, `--jarak-kartu` 12px,
`--kontrol-tinggi` 44px (bawaan, halaman guru), `--target-min` 24px, `--baris-tabel` 52px, `--kepala-tabel` (abu muda, ada
versi gelap). `.admin-konten` menimpa `--kontrol-tinggi` menjadi **40px**; di ponsel atau penunjuk sentuh (`pointer: coarse`)
kembali 44px agar target sentuh utama ≥44px. Tombol memakai `padding: calc((var(--kontrol-tinggi) - 1.5em) / 2) 18px`
sehingga tingginya mengikuti token. `h1`, `h2`, `main`, `.kartu`, `input/select` memakai token. Uji: `tests/unit/tema-css.test.ts`.

### DataTable (#26) — `src/components/ui/DataTable.tsx`

Komponen server. Properti: `keterangan` (caption tersembunyi), `kolom` (`id`, `label`, `sel`, `urut?`, `kelas?`, `tanpaLabelPonsel?`),
`baris`, `kunciBaris`, `kelasBaris?`, `ringkasan` (hasil `potongHalaman`), `dasar` (parameter URL yang dipertahankan),
`satuan`, `kosong` (EmptyState di dalam kartu). Kartu `.dt` mengisi tinggi sisa viewport lewat pembungkus
`.halaman-tabel` (`height: calc(100dvh - header - padding)`), badan `.dt__gulir` menggulir sendiri dengan `th` lengket,
footer `.dt__kaki` di dalam kartu: “Tampilkan [20 ▾] per halaman” (`PilihPerHalaman`, formulir GET), “Menampilkan x–y dari z”,
dan paginasi (tautan). `<th scope="col">`, `aria-sort` pada kolom yang dapat diurut, `<caption>` tersembunyi,
wilayah gulir dapat difokus papan ketik. Di bawah 640px tabel menjadi kartu bertumpuk (`data-label`), halaman yang
menggulir. Fungsi murni di `src/lib/dataTable.ts` (`ariaSort`, `arahBerikut`, `bangunTautan`, `teksRentang`, `urlDariIsian`,
`samaParam`) diuji di `tests/lib/dataTable.test.ts`. `BarisGuru` dipecah: baris kini didefinisikan sebagai kolom di halaman,
dan `AksiGuru` (komponen klien) hanya memegang tombol aksi + dialog.

### PageHeader (#27) — `src/components/ui/PageHeader.tsx`

`<h1>` + keterangan satu baris + pencarian bulat berikon (`role="search"`, `aria-label`) + slot aksi, satu baris ≥720px
(tinggi 54px di 1440×900), di ponsel judul / pencarian penuh lebar / aksi menurun. Memakai kelas `judul-aksi` sebagai dasar.
Dipakai di `/admin/guru` dan `/admin/antrean`; judul `Daftar guru` dan paragraf status terpisah dihapus.

### Satu pemilih periode (#28)

`PilihPeriodeHeader` (klien) menjadi satu-satunya pemilih: `onChange` memanggil `router.push` dengan
`paramPeriodeBaru` (`src/lib/pilihPeriodeUrl.ts`): parameter lain (`q`, `status`, `per`, `urut` …) dipertahankan, `hal` dan `dok`
dibuang. Tanpa JS: formulir GET dengan input tersembunyi untuk parameter lain dan tombol “Ganti” di `<noscript>`.
`PilihPeriode.tsx` dihapus; `/dokumen` guru memakai varian `guru` di header guru (`Kepala`).

### Filter langsung (#29) — `src/components/FormOtomatis.tsx`

Pembungkus formulir GET: `select` menerapkan saat `change`; kolom cari menerapkan setelah jeda 300ms atau Enter dengan
`router.replace` (satu permintaan per jeda, fokus dan kursor tetap karena hanya isi halaman yang diganti); `<noscript>`
memuat tombol kirim. Chip status ringkas berupa tautan `aria-current="true"` (satu baris, jumlah di dalam chip), jadi
berfungsi tanpa JS. Pembaruan hasil diumumkan lewat `role="status"` pada “Menampilkan x–y dari z”.

## 4. Hasil SESUDAH (akhir Fase 8, #24–#34)

Skrip dan data contoh yang sama dengan bagian 2 (12–13 guru, 5 dokumen). Angka adalah tinggi dokumen dalam piksel.
Di layar desktop (1366×768 dan 1440×900) semua halaman admin dan halaman guru **Dokumen** muat tanpa gulir halaman;
gulir hanya terjadi di dalam kartu tabel atau panel.

| Halaman | Layar | Sebelum (Fase 7) | Sesudah (akhir Fase 8) | Hasil |
|---|---|---:|---:|---|
| Beranda | 1440×900 | 1295 | 900 | muat (kosong 24) |
| Guru | 1440×900 | 1856 | 900 | muat (kosong 24) |
| Detail guru | 1440×900 | 1326 | 900 | muat (kosong 24) |
| Antrean | 1440×900 | 1561 | 900 | muat (kosong 24) |
| Periode | 1440×900 | 900 | 900 | muat (kosong 24) |
| Dokumen periode | 1440×900 | 1131 | 900 | muat (kosong 24) |
| Admin | 1440×900 | 900 | 900 | muat (kosong 24) |
| Alasan tolak | 1440×900 | 900 | 900 | muat (kosong 24) |
| Akun saya | 1440×900 | 900 | 900 | muat (kosong 24) |
| Tambah guru | 1440×900 | 900 | 900 | muat (kosong 149) |
| Impor guru | 1440×900 | 900 | 900 | muat (kosong 120) |
| Guru: Dokumen | 1440×900 | 1073 | 900 | muat (kosong 73) |
| Guru: Profil | 1440×900 | 1211 | 900 | muat (kosong 203) |
| Beranda | 1366×768 | 1295 | 768 | muat (kosong 24) |
| Guru | 1366×768 | 1856 | 768 | muat (kosong 24) |
| Detail guru | 1366×768 | 1809 | 768 | muat (kosong 24) |
| Antrean | 1366×768 | 1561 | 768 | muat (kosong 24) |
| Periode | 1366×768 | 768 | 768 | muat (kosong 24) |
| Dokumen periode | 1366×768 | 1131 | 768 | muat (kosong 24) |
| Admin | 1366×768 | 768 | 768 | muat (kosong 24) |
| Alasan tolak | 1366×768 | 768 | 768 | muat (kosong 24) |
| Akun saya | 1366×768 | 768 | 768 | muat (kosong 24) |
| Tambah guru | 1366×768 | 852 | 775 | +7 |
| Impor guru | 1366×768 | 867 | 820 | +52 |
| Guru: Dokumen | 1366×768 | 1073 | 888 | +120 |
| Guru: Profil | 1366×768 | 1211 | 768 | muat (kosong 71) |
| Beranda | 375×812 | 1763 | 1818 | +1006 |
| Guru | 375×812 | 9125 | 5971 | +5159 |
| Detail guru | 375×812 | 1266 | 902 | +90 |
| Antrean | 375×812 | 2883 | 4394 | +3582 |
| Periode | 375×812 | 1153 | 1150 | +338 |
| Dokumen periode | 375×812 | 1717 | 1410 | +598 |
| Admin | 375×812 | 812 | 812 | muat (kosong 363) |
| Alasan tolak | 375×812 | 812 | 812 | muat (kosong 117) |
| Akun saya | 375×812 | 812 | 812 | muat (kosong 140) |
| Tambah guru | 375×812 | 1135 | 1060 | +248 |
| Impor guru | 375×812 | 1081 | 1044 | +232 |
| Guru: Dokumen | 375×812 | 2119 | 1361 | +549 |
| Guru: Profil | 375×812 | 1574 | 1393 | +581 |

### Yang masih menggulir, dan alasannya

- **Ponsel (375×812) — Guru, Antrean, Beranda:** tabel berubah menjadi kartu bertumpuk (enam bidang per kartu) supaya tidak
  perlu geser horizontal. Dengan 20 baris per halaman, hasilnya panjang (Guru ±5970px, Antrean ±4390px setelah kartu dibuat dua kolom). Ini kompromi yang disengaja; pengurangan
  lebih lanjut perlu pagination default lebih kecil di ponsel atau baris kartu lebih ringkas (di luar lingkup Fase 8).
- **Ponsel — Dokumen periode, Periode, Tambah/Impor guru:** formulir dan daftar bertumpuk satu kolom; menggulir wajar.
- **Tambah guru / Impor guru di 1366×768:** lebih tinggi 7 dan 52px dari layar; formulir panjang dan sengaja tidak dipaksa
  masuk satu layar.
- **Guru: Dokumen / Profil di ponsel dan 1366×768:** daftar dokumen dan formulir panjang; di ponsel kartu dokumen pertama sudah
  tampak tanpa gulir (#33). `/profil` di 1440×900 muat satu layar (profil dan kata sandi berdampingan ≥1024px).
- Tinggi di bawah ±380px tidak memakai tata letak "satu layar" (lihat bagian 5).

### Uji otomatis

`tests/e2e/tanpa-gulir.spec.ts` memeriksa `document.documentElement.scrollHeight <= innerHeight + 1` di 1440×900 untuk
Beranda, Guru, Antrean, dan Detail guru. Uji ini sudah dicoba pada viewport 500px untuk memastikan ia memang gagal bila halaman menggulir.

## 5. Keputusan dan batasan

- `/admin/guru` dan `/admin/antrean` memakai `.halaman-tabel` (tinggi tetap sisa viewport) hanya ≥640px dan tinggi ≥380px.
- Halaman admin dialirkan di balik `loading.tsx` yang membutuhkan JavaScript untuk ditampilkan (sudah begitu sejak Fase 6),
  sehingga uji “tanpa JS” memeriksa HTML dari server (formulir GET, `<noscript>`, hasil penyaringan di server).
- Kriteria #26 “lolos axe” belum diukur otomatis karena tidak ada dependensi axe (tanpa dependensi baru); struktur
  semantik (caption, `scope`, `aria-sort`, label, fokus) dipenuhi dan perlu pemeriksaan axe manual.
- `next.config.ts` tidak diubah. Lencana “Issues” dev-Next muncul karena kunci React ganda pada chip alasan di
  `TombolKeputusan`; kunci diperbaiki (`${i}-${teks}`) sehingga lencana tidak lagi menutup tombol “Kirim penolakan”
  setelah padding bawah menjadi 24px.
