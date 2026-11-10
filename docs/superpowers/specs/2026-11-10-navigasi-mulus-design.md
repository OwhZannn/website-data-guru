# Navigasi mulus — perpindahan halaman tanpa muat ulang penuh

Tanggal: 2026-11-10 · Isu: #53 · Status: diimplementasikan

## Masalah
Semua 27 tautan internal memakai `<a href>` biasa (tidak ada `next/link`), sehingga setiap klik memuat ulang dokumen, CSS, dan JavaScript; sidebar dan header digambar ulang dan posisi gulir hilang.

## Yang diubah
- **`Tautan`** (`src/components/ui/Tautan.tsx`, logika di `src/lib/tautan.ts`): pembungkus `next/link`. Tetap `<a>` biasa untuk tautan luar, hash saja, dan `/api/…` (unduhan rekap harus tetap mengunduh). `href` yang hanya berisi query (`?hal=2`) memakai Link.
- Semua tautan internal memakai `Tautan`: sidebar dan laci ponsel, menu profil, breadcrumb, tajuk kolom dan paginasi `DataTable`, kartu statistik, dan tautan di halaman Beranda, Guru, Antrean, Dokumen, Profil, Masuk, Daftar. Tautan di baris tabel dan daftar panjang memakai `prefetch={false}`; paginasi dan urut memakai `scroll={false}`.
- **`BilahNavigasi`**: bilah 3 px di atas layar selama perpindahan (CSS, statis bila `prefers-reduced-motion`), disembunyikan dari pembaca layar; butir sidebar yang diklik diberi `aria-busy` dan `data-pindah`.
- **Kueri layout admin** (`wajibAdmin`, `semuaPeriode`) dibungkus `cache()` React: layout dan halaman berbagi hasil dalam satu permintaan, tidak ada cache antar permintaan, dan setiap halaman tetap memanggil `halamanAdmin()`.
- **Kerangka memuat admin dihapus** (11 `loading.tsx`); lihat "Temuan" di bawah. `loading.tsx` halaman guru (`/dokumen`, `/profil`) dipertahankan.
- Status lipat sidebar sudah diterapkan sebelum cat pertama oleh `SKRIP_AWAL` (tidak perlu perubahan kode); kini ada uji yang membuktikannya.

## Hasil ukur
Build produksi, 1440×900, 45 guru, median dari 5 perpindahan, diukur dari luar halaman (klik → judul halaman tujuan tampil), `prefers-reduced-motion: reduce` agar animasi masuk tidak ikut terhitung. Skrip pengukur sekali pakai berada di luar repo.

| Perpindahan | main: waktu | main: permintaan | main: dokumen HTML | cabang ini, dengan kerangka | cabang ini, tanpa kerangka |
|---|---:|---:|---:|---:|---:|
| Beranda → Guru | 380 ms | 11 | 1 | 375 ms | 83 ms |
| Guru → Antrean | 381 ms | 11 | 1 | 374 ms | 77 ms |
| Antrean → Beranda | 380 ms | 11 | 1 | 375 ms | 77 ms |
| Beranda → Periode | 78 ms | 12 | 1 | 374 ms | 77 ms |

Permintaan per perpindahan: 11–12 → 2–3, dokumen HTML: 1 → 0, penanda `window` bertahan.

## Temuan: kerangka memuat membuat setiap klik menunggu ±300 ms
Server menjawab dalam 3–16 ms (RSC 1–5 ms), dan data tiba ±25 ms setelah klik, tetapi judul halaman baru baru tampil di ±310 ms. Penyebabnya React sendiri: setelah menampilkan batas `Suspense`/`loading.tsx`, React menahan isi sebenarnya hingga `FALLBACK_THROTTLE_MS = 300` ms berlalu (`react-dom-client.development.js`), supaya kerangka tidak berkedip. Pada server yang cepat itu murni tunda.

Dicoba dengan menyingkirkan sementara semua `loading.tsx` admin: 375 ms → 77 ms. Tanpa kerangka, halaman lama tetap terlihat sampai halaman baru siap, dan bilah kemajuan di atas yang memberi tahu bahwa perpindahan berlangsung. Keputusan: **11 kerangka admin dihapus**, bilah kemajuan dipertahankan. Ini membalik keputusan Fase 6 untuk halaman admin; kerangka halaman guru tetap karena bukan bagian dari navigasi sidebar.

Catatan jujur: tanpa kerangka, di jaringan yang lambat pengguna melihat halaman lama dengan bilah di atas, bukan kerangka halaman baru. Pada server yang cepat (kondisi saat ini) ini lebih baik; bila nanti ada halaman yang benar-benar lambat, beri `loading.tsx` hanya pada halaman itu.

Baseline pertama di isu (`386/843/819/42 ms`) memakai cara ukur lain (menunggu `main h1` apa pun, sehingga halaman lama ikut terhitung) dan tidak dipakai di sini.

## Pengujian
`tests/e2e/navigasi.spec.ts` (7 uji, 1440×900): penanda `window` bertahan dan tidak ada permintaan dokumen baru saat klik sidebar; Kembali/Maju; urut dan paginasi tanpa muat ulang; unduh rekap tetap mengunduh; klik tengah membuka tab baru; bilah kemajuan tampil saat rute diperlambat 900 ms lalu selesai (`aria-busy` terpasang dan dilepas); status lipat sidebar sudah ada saat `<body>` pertama muncul. Uji utama terbukti gagal bila satu tautan sidebar dikembalikan ke `<a>`. `tests/unit/tautan.test.ts`: 14 kasus untuk penentuan Link atau `<a>`.

## Kriteria isu #53
- Klik sidebar tidak memuat ulang dokumen — terpenuhi (diuji).
- Sidebar, header, dan menu profil tidak berkedip — penanda `window` bertahan dan tidak ada dokumen baru; kedipan visual tidak diukur terpisah.
- Umpan balik ≤ 100 ms — bilah kemajuan muncul pada klik; kerangka admin sengaja dihapus (lihat di atas).
- Waktu perpindahan turun — **ya, 380 → 77 ms** (setelah kerangka dihapus); dengan kerangka tidak berubah.
- Paginasi/urut/filter tidak menggulirkan ke atas — `scroll={false}` dipasang; perilaku gulir diuji hanya sebatas alamat dan tanpa muat ulang, bukan posisi piksel.
- Kembali/Maju, tab baru, unduhan — terpenuhi (diuji).
- Fokus pindah ke judul bagi pembaca layar — **belum dikerjakan**.
- `loading.tsx` untuk semua rute — **sengaja tidak untuk admin**, lihat di atas.
