# Fase 7 — Tema Terang/Gelap/Sistem, Menu Profil, Sidebar Baru, Gerak, dan Perbaikan Tata Letak

Tanggal: 2026-11-08
Status: Diimplementasikan
Cabang: `feat/tema-dan-tata-letak`
Rencana induk: [audit & rencana UI/UX](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) — bagian "Fase 7".

## Tujuan
Memperbaiki cacat tata letak yang terlihat di `/admin/antrean` pada layar lebar mode gelap, lalu memberi aplikasi tampilan SaaS modern: pilihan tema, menu profil, sidebar berkelompok yang bisa dilipat, dan gerak halus. Alur, API, dan basis data tidak berubah. Tidak ada dependensi baru; animasi murni CSS.

## 1. Audit tata letak (sebelum → sesudah)
Diukur dengan skrip Playwright sekali pakai (375 / 1440 / 2000 px, terang dan gelap, seluruh halaman admin dan guru; skrip tidak disimpan di repo).

| Temuan sebelum | Sesudah |
|---|---|
| Hamburger tampil di desktop (terukur di 36 dari 36 halaman ≥1024 px) | `.admin-kepala__hamburger-slot` hanya `display:flex` di bawah 1024 px; tes e2e: tersembunyi di 1280 px, terlihat di 360 px |
| Jalur kosong di atas sidebar desktop | Sidebar `position: sticky` tepat di bawah header (tinggi 60 px), tanpa ruang kosong; judul kelompok mulai langsung |
| Teks polos "admin" dan "Keluar" tanpa gaya di header | Diganti menu profil (avatar inisial, nama, peran, panah) |
| Tombol "Terapkan" tak sejajar pilihan periode (bawah 40 vs 44 px, 54 kejadian) | Kontrol header 36 px seragam; tombol filter 48 px sama dengan isian (`.filter-gabungan__baris .tombol-sm`, `.baris-input button`) |
| Pilihan melebar di layar lebar | `.medan { max-width: 320px }`, `.form-filter` rata bawah |
| Tautan tabel bergaris bawah ("Periksa →", nama) | `.tombol-tabel` (pil halus) untuk aksi, `.tautan-nama` polos dan garis bawah hanya saat hover |
| Lebar konten tak konsisten (kiri 220/570 px pada 2000 px) | Konten admin dipusatkan dengan lebar maks; halaman guru tetap sempit |
| Gaya sebaris (`style="…"`) di 20+ tempat | Dipindah ke kelas (`.mb-s5`, dll.) di commit ab67b86 |
| Teks butir pemeriksaan putih di atas putih | Diperbaiki memakai token |

Sisa yang disengaja: tabel antrean di 375 px bergulir mendatar di dalam `.geser` (660 px dalam wadah 341 px); gulir terkurung di wadah, halaman tidak ikut meluap.

## 2. Tema
- Atribut `data-tema="terang|gelap"` pada `<html>`; tanpa atribut = ikut perangkat (Sistem, bawaan).
- Token gelap berlaku pada `:root[data-tema=gelap]` dan `@media (prefers-color-scheme: dark) { :root:not([data-tema=terang]) }`. CSS tak bisa menggabungkan keduanya tanpa pengulangan, jadi isinya ditulis dua kali dan `tests/unit/tema-css.test.ts` memastikan kedua blok identik serta setiap token gelap punya nilai terang.
- `localStorage['tema']` berisi `terang`/`gelap`; Sistem menghapus kuncinya.
- Skrip sebaris di `<head>` (`SKRIP_AWAL` di `src/lib/tema.ts`) memasang atribut sebelum digambar sehingga tidak berkedip; juga memasang status sidebar terlipat dan `theme-color`. `<html suppressHydrationWarning>`.
- `PilihTema` (kontrol segmen, `radiogroup`) tampil di halaman masuk/daftar; di menu profil sebagai `menuitemradio`. Berlaku di halaman admin dan guru.

## 3. Menu profil
`MenuProfil` di kanan atas (admin dan guru): avatar bulat berinisial, nama, peran ("Admin"/"Guru"), panah. Dropdown berisi:
- Guru: "Dokumen saya", "Profil & kata sandi" (`/profil`). Admin: tidak ada halaman akun, jadi hanya email sebagai keterangan.
- Pilihan tema Terang / Gelap / Sistem.
- "Keluar" (logika `useKeluar` yang sama dengan `TombolKeluar`).

Aksesibilitas: pemicu `aria-haspopup="menu"` + `aria-expanded`; `role="menu"`; fokus ke butir pertama saat terbuka; panah atas/bawah/kiri/kanan, Home, End; Escape menutup dan mengembalikan fokus ke pemicu; Tab menutup; klik di luar menutup; panah bawah pada pemicu membuka.

## 4. Sidebar
- Kelompok dengan judul huruf kapital kecil: UTAMA (Beranda, Antrean), DATA (Guru, Periode), PENGATURAN (Alasan penolakan, Admin).
- Butir aktif: warna lembut + batang aksen kiri; `aria-current="page"`; `nav aria-label="Menu admin"`.
- Lencana pil jumlah antrean.
- Tombol "Lipat menu" di dasar; mode ikon dengan tooltip CSS (hover dan fokus); lebar 248 → 68 px bertransisi; status disimpan di `localStorage['admin-sidebar-collapsed']` dan `data-sidebar="lipat"` pada `<html>` (dipasang skrip awal, tanpa lompatan).
- Sticky setinggi layar di bawah header. Laci ponsel memakai pengelompokan yang sama; perangkap fokus tetap (tes `fokus.spec.ts`).

## 5. Tampilan dan gerak (CSS saja)
- Header: permukaan bersih + garis bawah, bukan blok hijau; hijau jadi aksen; logo dipertahankan.
- Isi halaman masuk dengan fade + geser 8 px (`TransisiHalaman`, kunci per alamat).
- Kartu/statistik terangkat saat hover; tombol memberi umpan balik saat ditekan; transisi dropdown/laci; transisi warna halus hanya saat tema diganti (kelas `tema-berubah` sementara, jadi tidak ada transisi saat pemuatan pertama).
- Tabel: kepala lengket, baris disorot saat hover, wadah membulat.
- Cincin fokus jelas (`--fokus`).
- Semua gerak di dalam `@media (prefers-reduced-motion: no-preference)`; pengguna yang meminta gerak berkurang mendapat perubahan seketika.

## 6. Kontras (WCAG 2.x, rumus luminans relatif)
Ambang: teks 4,5:1, komponen UI 3:1. Diuji otomatis di `tests/unit/tema-css.test.ts`.

| Pasangan | Terang | Gelap |
|---|---|---|
| teks / latar | 13,59 | 15,18 |
| teks / kartu | 14,75 | 13,73 |
| redup / kartu | 5,63 | 7,49 |
| redup / latar | 5,19 | 8,28 |
| tautan / kartu | 5,40 | 8,60 |
| tautan-kuat / hijau-muda (butir sidebar aktif) | 6,65 | 8,30 |
| di-aksen / hijau-2 (tombol) | 5,40 | 5,40 |
| di-aksen / bahaya (tombol, lencana) | 6,57 | 5,52 |
| sah / sah-bg | 5,27 | 7,88 |
| tolak / tolak-bg | 5,37 | 7,83 |
| tunggu / tunggu-bg | 5,25 | 7,84 |
| belum / belum-bg | 5,94 | 7,45 |
| info / info-bg | 5,52 | 8,03 |
| alasan-teks / alasan-bg | — | 10,36 |
| galat / galat-bg | — | 7,76 |
| teks / permukaan-3 (hover) | 11,39 | 10,79 |
| garis-input / kartu (UI ≥3) | 3,43 | 3,29 |
| fokus / kartu (UI ≥3) | 5,40 | 8,60 |

Semua memenuhi AA.

## 7. Pengujian
- Unit: `tema-css.test.ts` (blok gelap identik, token lengkap, kontras AA terang dan gelap).
- E2E `tema.spec.ts`: tema bertahan setelah muat ulang dan memasang `data-tema`; Sistem menghapusnya; tanpa kilatan; Terang mengalahkan perangkat gelap; menu profil dengan papan ketik (buka/tutup/fokus kembali) dan Keluar mengakhiri sesi; hamburger tersembunyi di 1280 px dan terlihat di 360 px; sidebar berkelompok, lipat bertahan, tooltip, lencana.
- `sidebar.spec.ts` dan `fokus.spec.ts` tetap lulus. `akun.spec.ts` kini membuka menu profil sebelum mengeklik "Profil & kata sandi". Pembantu `bukaMenu` dipindah ke `bantu.ts`.
- Snapshot visual `z-visual.spec.ts` dibuat ulang (20 gambar).
