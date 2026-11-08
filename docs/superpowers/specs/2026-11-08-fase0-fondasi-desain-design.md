# Spesifikasi Fase 0 — Fondasi Desain

Tanggal: 2026-11-08 · Status: selesai  
Hubungan: [Rencana UI/UX](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) §3 Fase 0 · mempertahankan semua token dari [Tampilan Bersih Modern](2026-11-06-tampilan-bersih-modern-design.md)

---

## Tujuan

Menyiapkan landasan sistem desain yang konsisten sebelum komponen atau halaman baru ditambahkan:
token CSS terstandar, ikon semantik (Lucide), dan komponen UI primitif yang bisa dipakai ulang di seluruh aplikasi.

---

## Token CSS (`src/app/globals.css`)

### Skala jarak (`--s-*`)
| Nama | Nilai | Kegunaan |
|---|---|---|
| `--s-1` | `4px` | jarak mikro (inline gap) |
| `--s-2` | `8px` | jarak kecil (gap antar chip) |
| `--s-3` | `12px` | margin antar elemen kecil |
| `--s-4` | `16px` | padding kartu, margin antar blok |
| `--s-5` | `20px` | jarak sedang |
| `--s-6` | `24px` | margin section |
| `--s-7` | `32px` | jarak besar |
| `--s-8` | `48px` | padding vertikal halaman |

### Skala tipografi (`--t-*`)
| Nama | Nilai | Kegunaan |
|---|---|---|
| `--t-xs` | `0.75rem` | keterangan kecil |
| `--t-sm` | `0.85rem` | label, metadata |
| `--t-base` | `1rem` | teks tubuh |
| `--t-md` | `1.05rem` | subjudul kecil |
| `--t-lg` | `1.1rem` | subjudul |
| `--t-xl` | `1.45rem` | judul halaman (h1) |
| `--t-2xl` | `1.7rem` | judul halaman besar (desktop) |

### Radius (`--r-*`)
| Nama | Nilai |
|---|---|
| `--r-sm` | `6px` |
| `--r` | `14px` (sudah ada, tidak berubah) |
| `--r-pill` | `999px` |

### Elevasi (`--bayang-*`)
| Nama | Nilai |
|---|---|
| `--bayang` | (sudah ada, tidak berubah) |
| `--bayang-sm` | `0 1px 2px rgba(16,40,28,.06)` |
| `--bayang-md` | `0 4px 12px rgba(16,40,28,.10)` |

### Warna info (`--info-*`)
| Nama | Nilai |
|---|---|
| `--info-bg` | `#e8f1fc` |
| `--info` | `#1a5eb8` |

---

## Komponen primitif (`src/components/ui/`)

| Komponen | File | Props utama |
|---|---|---|
| `StatCard` | `StatCard.tsx` | `nilai`, `label`, `warna?` |
| `Badge` | `Badge.tsx` | `status`, `children` |
| `Section` | `Section.tsx` | `judul`, `aksi?`, `children` |
| `EmptyState` | `EmptyState.tsx` | `ikon`, `teks`, `aksi?` |
| `ProgressBar` | `ProgressBar.tsx` | `nilai`, `maks` **atau** `segmen[]` |
| `Breadcrumb` | `Breadcrumb.tsx` | `butir[]` → `{ label, href? }` |

Semua komponen adalah Server Components (tanpa `'use client'`).

---

## Ikon Lucide

Menggantikan glyph teks di `KartuDokumen`:
| Glyph lama | Ikon Lucide | Status |
|---|---|---|
| `↑` (BELUM) | `<Upload />` | ✓ |
| `⏳` (MENUNGGU) | `<Clock />` | ✓ |
| `✓` (SAH) | `<CheckCircle2 />` | ✓ |
| `!` (DITOLAK) | `<AlertCircle />` | ✓ |

Semua ikon ditambahkan `aria-hidden="true"` dan teks label tetap tampil.

---

## Pemeriksaan Kontras WCAG AA

Semua pasangan teks/latar sudah memenuhi rasio minimum 4,5:1 (teks normal):

| Pasangan | Rasio | Hasil |
|---|---|---|
| `--redup` di `--latar` (#f4f6f5) | 5,19 | ✅ LULUS |
| `--redup` di `--kartu` (#fff) | 5,63 | ✅ LULUS |
| `--tunggu` (#8a5a00) di `--tunggu-bg` | 5,25 | ✅ LULUS |
| `--sah` (#15703a) di `--sah-bg` | 5,27 | ✅ LULUS |
| `--tolak` (#b42318) di `--tolak-bg` | 5,37 | ✅ LULUS |
| `--belum` (#4f5d56) di `--belum-bg` | 5,94 | ✅ LULUS |
| `--teks` di `--latar` | 13,59 | ✅ LULUS |
| `--teks` di `--kartu` | 14,75 | ✅ LULUS |
| `--info` (#1a5eb8) di `--info-bg` (#e8f1fc) | 5,42 | ✅ LULUS |

Tidak ada nilai yang perlu digelapkan.

---

## Kriteria Penerimaan

- [ ] `npx tsc --noEmit` tanpa error
- [ ] `npx vitest run` → 28 file / 214 tes lulus
- [ ] `npx next build` berhasil
- [ ] `npx playwright test` seluruh tes e2e lulus
- [ ] Tidak ada `style={{ margin:... }}` statis tersisa (kecuali `conic-gradient` di KartuProgres)
- [ ] Token `--s-*`, `--t-*`, `--r-sm`, `--r-pill`, `--bayang-sm`, `--bayang-md`, `--info-bg`, `--info` tersedia di `:root`
- [ ] Semua glyph teks ikon di `KartuDokumen` diganti ikon Lucide dengan `aria-hidden`
- [ ] Komponen UI primitif tersedia di `src/components/ui/`
