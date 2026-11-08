# Spesifikasi Fase 1 — Tata Letak Admin

Tanggal: 2026-11-08 · Status: selesai
Hubungan: [Rencana UI/UX](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) §3 Fase 1 & §4 Keputusan

---

## Tujuan

Menggantikan bilah tab horizontal di header dengan sidebar kiri yang bisa dilipat, menambahkan pemilih periode global di header, dan menyediakan navigasi mobile berupa laci (drawer) dengan tombol hamburger. Semua halaman guru tetap menggunakan `Kepala` yang ada tanpa perubahan.

---

## Komponen Baru

### `AdminShell` (`src/components/AdminShell.tsx`)

Komponen server utama yang membentuk tata letak tiga bagian:

```
┌─── AdminHeader ────────────────────────────────────────┐
│ ☰  Logo · Panel Admin · [Pemilih Periode ▾] · Nama · Keluar │
└────────────────────────────────────────────────────────┘
┌─── sidebar ───┐  ┌── area konten ──────────────────────┐
│ Beranda       │  │ <children>                           │
│ Antrean  [●3] │  │                                      │
│ Guru          │  │                                      │
│ Periode       │  │                                      │
│ Al. Penolakan │  │                                      │
│ Admin         │  │                                      │
└───────────────┘  └──────────────────────────────────────┘
```

- Di layar ≥ 1024 px: sidebar ditampilkan di kiri; bisa dilipat ke lebar ikon saja (48 px); status lipatan disimpan di `localStorage` (`admin-sidebar-collapsed`).
- Di layar < 1024 px: sidebar tersembunyi; tombol hamburger di header membuka laci (drawer) dari kiri dengan overlay.
- Sidebar tidak dirender untuk pengguna yang tidak terautentikasi — otentikasi tetap di setiap halaman via `halamanAdmin()`.

### `AdminSidebarClient` (`src/components/AdminSidebarClient.tsx`)

Komponen klien untuk:
- Status dilipat/dibuka sidebar (baca/tulis `localStorage`).
- Status buka/tutup laci mobile.
- Kelas CSS aktif berdasarkan `pathname` (via `usePathname`).

### `AdminHeader` (`src/components/AdminHeader.tsx`)

Header admin: logo, judul, tombol hamburger (mobile), pemilih periode, nama admin, tombol keluar.

---

## Navigasi Admin

| Butir | Rute | Ikon Lucide | Keterangan |
|---|---|---|---|
| Beranda | `/admin` | `LayoutDashboard` | Tepat cocok `pathname === '/admin'` |
| Antrean | `/admin/antrean` | `Inbox` | Badge merah = jumlah `DokumenGuru` status `MENUNGGU` di periode terbuka |
| Guru | `/admin/guru` | `Users` | Aktif bila `pathname.startsWith('/admin/guru')` |
| Periode | `/admin/periode` | `CalendarDays` | Aktif bila `pathname.startsWith('/admin/periode')` |
| Alasan penolakan | `/admin/alasan` | `MessageSquareX` | Fase 3 membangunnya; saat ini placeholder "Segera hadir" |
| Admin | `/admin/admin` | `Shield` | Tepat cocok |

Butir aktif ditandai `aria-current="page"` dan kelas `.aktif`. Navigasi diberi `aria-label="Menu admin"`.

---

## Pemilih Periode Global

- Ditempatkan di header admin.
- Menggunakan `PilihPeriode` yang ada (kirim GET `?periode=`).
- URL saat ini dipertahankan sebagai `action` form; parameter `periode` diteruskan ke tautan sidebar.
- Halaman yang sudah menerima `?periode=` (daftar guru, detail guru) tetap berfungsi tanpa perubahan.

---

## Breadcrumb

Breadcrumb ditambahkan ke halaman dalam:

| Halaman | Butir breadcrumb |
|---|---|
| `/admin/guru/tambah` | Beranda → Guru → Tambah guru |
| `/admin/guru/impor` | Beranda → Guru → Impor guru |
| `/admin/guru/[id]` | Beranda → Guru → (nama guru) |
| `/admin/periode/[id]/dokumen` | Beranda → Periode → (nama periode) → Dokumen |

Komponen `Breadcrumb` dari `src/components/ui/Breadcrumb.tsx` (Fase 0) digunakan langsung.

---

## Halaman Placeholder

### `/admin/antrean`
Menampilkan daftar `DokumenGuru` berstatus `MENUNGGU` di periode terbuka, atau tautan kembali ke beranda jika tidak ada. Minimal, fungsional, dilindungi `halamanAdmin()`.

### `/admin/alasan`
Menampilkan pesan "Segera hadir" dengan ikon dan keterangan singkat. Dilindungi `halamanAdmin()`.

---

## Token & Warna

Semua warna menggunakan token CSS dari `globals.css`; tidak ada warna dikodekan langsung. Ini memastikan kompatibilitas dark mode (Fase 6).

Kelas CSS baru:
- `.admin-cangkang` — grid dua kolom (sidebar + konten)
- `.admin-sidebar` — panel sidebar
- `.admin-sidebar.dilipat` — sidebar dilipat (hanya ikon)
- `.admin-nav-butir` — satu butir navigasi
- `.admin-nav-butir.aktif` — butir aktif
- `.admin-laci` — overlay laci mobile
- `.admin-konten` — area konten utama
- `.admin-kepala` — header admin

---

## Aksesibilitas

- `<nav aria-label="Menu admin">` — konsisten dengan pengujian e2e yang ada.
- Tombol lipat sidebar: `aria-label="Lipat sidebar"` / `"Buka sidebar"`, `aria-expanded`.
- Tombol hamburger: `aria-label="Buka menu navigasi"`, `aria-expanded`.
- Butir aktif: `aria-current="page"`.
- Overlay laci: klik atau tekan `Escape` untuk menutup.

---

## Pengujian e2e Baru (`tests/e2e/sidebar.spec.ts`)

| Tes | Lebar layar |
|---|---|
| Navigasi sidebar dan `aria-current` | 1280 × 800 |
| Navigasi mobile melalui laci | 360 × 740 (default) |
