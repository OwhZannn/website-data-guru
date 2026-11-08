# Fase 6 — Status Memuat, Status Kosong, Fokus Dialog, Mode Gelap, Uji Visual

Tanggal: 2026-11-08
Status: Diimplementasikan
Cabang: `feat/dasbor-ui-ux`
Rencana induk: [audit & rencana UI/UX](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) — temuan F1, F2, F5, V4, T4.

## Tujuan
Menutup sisa celah tampilan: layar kosong saat halaman server disusun, daftar kosong yang hanya berupa satu kalimat abu-abu, fokus papan ketik di dialog, dan mode gelap yang mengikuti pengaturan perangkat. Alur, API, dan basis data tidak berubah.

## 1. Kerangka memuat
- Komponen `src/components/ui/Kerangka.tsx`: pembungkus `aria-busy="true"` dengan teks `Memuat…` untuk pembaca layar (`.sr-only`, `role="status"`), dan `Blok` berkilau.
- `loading.tsx` untuk: `/admin`, `/admin/guru`, `/admin/guru/[id]`, `/admin/antrean`, `/dokumen`. Halaman admin dirender di dalam AdminShell, jadi sidebar tetap tampil saat memuat.
- Animasi kilau mati bila `prefers-reduced-motion: reduce`.

## 2. Status kosong
`EmptyState` (ikon + teks + aksi opsional) menggantikan kalimat kosong di: beranda admin (antrean, aktivitas, rincian per dokumen + tautan "Atur dokumen periode"), antrean (tidak ada periode / tidak ada dokumen), detail guru (tidak ada dokumen wajib), kelola alasan, dan kelola dokumen periode. Kalimatnya tidak diubah supaya tes tetap berlaku. Riwayat kosong dan pratinjau tanpa file tetap berupa teks kecil karena berada di dalam kartu.

## 3. Fokus
- `Konfirmasi` memakai `<dialog>.showModal()`: peramban sudah mengunci fokus, menutup dengan Escape, dan mengembalikan fokus ke pemicu. Kini diuji di `tests/e2e/fokus.spec.ts`.
- Laci menu ponsel (`AdminLaci`): fokus pindah ke butir pertama saat dibuka, Tab/Shift+Tab berputar di dalam laci, Escape menutup, fokus kembali ke tombol hamburger.
- Toast: hanya wadah `role="status"` `aria-live="polite"`; `role="alert"` per toast dihapus agar tidak dibacakan dua kali dan tidak mengganggu.

## 4. Mode gelap
- `@media (prefers-color-scheme: dark)` menimpa token di `:root`. Tidak ada tombol pilihan; mengikuti perangkat.
- Semua warna tetap di `globals.css` dipindah ke token semantik baru (`--permukaan`, `--permukaan-2/3`, `--garis-input`, `--di-aksen`, `--tautan`, `--tautan-kuat`, `--bahaya`, `--alasan-*`, `--tunggu-baris`, `--galat*`, `--kaca-*`, `--tirai`, `--bayang-*`, `--kerangka*`). Hijau sebagai **teks** (`--tautan`) dipisah dari hijau sebagai **latar** (`--hijau`, `--hijau-2`) supaya keduanya bisa diatur terpisah di mode gelap.
- Warna tetap di komponen (cincin progres, tombol hamburger) diganti token.
- `viewport.colorScheme = 'light dark'` dan `themeColor` per skema di `src/app/layout.tsx`.
- Logo resmi tidak diubah warnanya; di mode gelap diberi lencana putih membulat.
- `--garis-input` digelapkan dari `#cfd8d3` ke `#7f8e86` agar batas input memenuhi 3:1 (WCAG 1.4.11) di mode terang juga.

### Kontras (WCAG AA)
Dihitung dengan rumus luminans relatif WCAG 2.1. Teks normal ≥ 4,5; komponen UI ≥ 3.

| Pasangan | Terang | Gelap |
|---|---|---|
| `--teks` / `--latar` (min 4.5) | 13.59 | 15.18 |
| `--teks` / `--permukaan` (min 4.5) | 14.75 | 13.73 |
| `--teks` / `--permukaan-2` (min 4.5) | 14.22 | 12.64 |
| `--redup` / `--latar` (min 4.5) | 5.19 | 8.28 |
| `--redup` / `--permukaan` (min 4.5) | 5.63 | 7.49 |
| `--redup` / `--permukaan-2` (min 4.5) | 5.43 | 6.89 |
| `--tautan` / `--permukaan` (min 4.5) | 5.40 | 8.60 |
| `--tautan` / `--latar` (min 4.5) | 4.97 | 9.52 |
| `--tautan-kuat` / `--permukaan` (min 4.5) | 7.51 | 10.76 |
| `--sah` / `--sah-bg` (min 4.5) | 5.27 | 7.88 |
| `--tolak` / `--tolak-bg` (min 4.5) | 5.37 | 7.83 |
| `--tunggu` / `--tunggu-bg` (min 4.5) | 5.25 | 7.84 |
| `--belum` / `--belum-bg` (min 4.5) | 5.94 | 7.45 |
| `--info` / `--info-bg` (min 4.5) | 5.52 | 8.03 |
| `--hijau-tua` / `--sah-bg` (min 4.5) | 8.88 | 9.35 |
| `--alasan-teks` / `--alasan-bg` (min 4.5) | 9.84 | 10.36 |
| `--galat` / `--galat-bg` (min 4.5) | 5.74 | 7.76 |
| `--di-aksen` / `--hijau` (min 4.5) | 7.51 | 8.15 |
| `--di-aksen` / `--hijau-2` (min 4.5) | 5.40 | 5.40 |
| `--di-aksen` / `--bahaya` (min 4.5) | 6.57 | 5.52 |
| `--di-aksen` / `--tolak-hover` (min 4.5) | 8.96 | 7.79 |
| `--teks` / `--tunggu-baris` (min 4.5) | 14.18 | 13.16 |
| `--tolak` / `--permukaan` (min 4.5) | 6.57 | 8.85 |
| `--sah` / `--permukaan` (min 4.5) | 6.16 | 10.21 |
| `--tunggu` / `--permukaan` (min 4.5) | 5.93 | 9.98 |
| `--info` / `--permukaan` (min 4.5) | 6.29 | 8.68 |
| `--teks` / `--permukaan-3` (min 4.5) | 11.39 | 10.79 |
| `--mati` / `--permukaan` (min 3.0) | 1.95 ✗ | 2.98 ✗ |
| `--garis-input` / `--permukaan` (min 3.0) | 3.43 | 3.29 |

Pengecualian: `--mati` dipakai hanya untuk tautan paginasi yang **nonaktif**; WCAG 1.4.3 tidak mewajibkan kontras untuk komponen nonaktif.

## 5. Uji visual
`tests/e2e/z-visual.spec.ts` memotret `/masuk`, beranda admin, daftar guru, detail guru, dan `/dokumen` pada 375px dan 1440px, terang dan gelap (20 gambar di `tests/e2e/z-visual.spec.ts-snapshots/`). Berkas diawali `z-` agar berjalan terakhir karena ia mengosongkan basis data e2e lalu mengisi data tetap. Waktu, riwayat, dan iframe disamarkan; `animations: 'disabled'`; `maxDiffPixelRatio: 0.02`.

Catatan: gambar acuan berakhiran `-darwin` (dibuat di macOS). Di Linux/CI, buat acuan sendiri dengan `npx playwright test tests/e2e/z-visual.spec.ts --update-snapshots`.

## Kriteria selesai
- tsc, vitest, next build lulus.
- Seluruh Playwright lulus dua kali berturut-turut (membuktikan gambar acuan stabil).
