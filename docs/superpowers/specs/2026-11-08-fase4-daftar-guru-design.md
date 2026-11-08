# Spesifikasi Fase 4 — Daftar Guru

Tanggal: 2026-11-08 · Fase: 4 · Status: implemented
Referensi: [`2026-11-08-dashboard-ui-ux-audit-and-plan.md`](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) bagian §3 Phase 4; temuan T1–T5, A3.

---

## 1. Latar Belakang

Halaman `/admin/guru` sudah berfungsi (paginasi, filter status, carian) namun kekurangan:
- Tidak ada urutan kolom (admin tidak bisa mencari sekolah tertentu atau melihat siapa paling lambat).
- Kolom progres hanya teks "x/y" tanpa bilah visual.
- Filter status, carian, asal sekolah, dan jenis pegawai terpisah sehingga sulit dikombinasikan.
- Tidak ada tanda visual siapa yang belum aktif di periode ini (kolom aktivitas).
- Di ponsel tabel terlalu lebar dan tidak bisa dibaca dengan nyaman.

---

## 2. Keputusan Rancangan

### 2.1 Kolom yang bisa diurut

| `?urut=` | Keterangan |
|---|---|
| `nama` | Nama guru (default, huruf kecil, lokal `id`) |
| `sekolah` | `asalSekolah` |
| `progres` | Rasio `jumlahSah / jumlahWajib` |
| `aktivitas` | Waktu `Riwayat` terbaru guru di periode ini; `null` = paling lama |

Arah: `?arah=asc` (default) atau `?arah=desc`.

**Aturan tetap**: guru yang belum disetujui (`disetujui === false`) selalu berada di kelompok pertama, apapun kolom urut yang dipilih. Di dalam kelompok baru diterapkan kolom urut.

Logika urut murni berada di `src/lib/urutGuru.ts` dengan unit test di `tests/lib/urutGuru.test.ts`.

Urutan diterapkan **sebelum** paginasi.

### 2.2 Tajuk kolom yang bisa diklik

- `<a>` dengan `aria-sort="ascending"` / `"descending"` / `"none"` pada kolom aktif.
- Ikon `lucide-react` `ChevronUp` / `ChevronDown` / `ChevronsUpDown` di samping teks.
- Klik tajuk aktif membalik arah; klik tajuk lain mengganti kolom dengan `asc`.

### 2.3 Kolom Progres

- Komponen `<ProgressBar nilai={jumlahSah} maks={jumlahWajib} />` dari `src/components/ui/ProgressBar.tsx`.
- Teks `"x/y"` di bawah/samping bilah, font `var(--t-xs)`.
- Bila guru belum disetujui, tampilkan `-`.

### 2.4 Bar filter gabungan

Satu `<form method="GET">` yang memuat:
1. **Chip status** (`<input type="radio" name="status">`) — kunci FILTER yang ada, termasuk `menunggu` dengan label **"Belum disetujui"** (dengan jumlah).
2. **Carian** `q` — `<input type="search">`.
3. **Asal sekolah** `asalSekolah` — `<select>` berisi nilai distinct dari DB.
4. **Jenis pegawai** `statusPegawai` — `<select>` dari `LABEL_PEGAWAI`.
5. **Tombol** "Terapkan filter" (submit) + tautan **"Hapus filter"** (ke `?periode=...`).

Parameter `periode`, `urut`, `arah`, `hal`, `per` dipertahankan lewat hidden input.

### 2.5 Tajuk tabel lengket

`position: sticky; top: var(--header-tinggi)` supaya tajuk tidak hilang saat scroll.
Hover baris: `background: var(--hijau-muda)`.

### 2.6 Klik seluruh baris

Teknik CSS *stretched link*: `<td>` nama memuat `<a>` dengan `position: relative` dan `::after { content:''; position:absolute; inset:0 }` diperluas ke `.baris-guru` yang berposisi `position: relative`. Tidak ada JavaScript.

### 2.7 Kartu ponsel (< 640 px)

Di bawah 640 px, tabel tersembunyi dan setiap guru ditampilkan sebagai `.kartu-guru-ponsel`. Implementasi CSS-only: `@media (max-width: 639px)` menyembunyikan `thead` dan mengubah setiap `tr` menjadi blok dengan pseudo-label dari `data-label` pada `td`.

### 2.8 EmptyState

Ketika tidak ada guru yang cocok setelah filter/carian, tampilkan `<EmptyState>` dengan ikon `SearchX` dari lucide dan teks **"Tidak ada guru yang cocok."**.

---

## 3. File yang Diubah / Dibuat

| File | Perubahan |
|---|---|
| `src/lib/urutGuru.ts` | Baru — logika urut murni |
| `tests/lib/urutGuru.test.ts` | Baru — unit test |
| `src/app/admin/guru/page.tsx` | Diperbarui — semua fitur di atas |
| `src/components/BarisGuru.tsx` | Diperbarui — ProgressBar, stretched link, data-label |
| `src/app/globals.css` | Diperbarui — sticky thead, row hover, kartu ponsel |
| `tests/e2e/fase4.spec.ts` | Baru — e2e urut nama desc + filter gabungan |
| `docs/superpowers/specs/2026-11-08-fase4-daftar-guru-design.md` | Dokumen ini |

---

## 4. Batasan

- Tidak ada perubahan skema database.
- Kolom `aktivitas` diambil dengan satu `groupBy` Prisma (bukan N+1).
- Semua warna dan jarak menggunakan token dari `globals.css`.
