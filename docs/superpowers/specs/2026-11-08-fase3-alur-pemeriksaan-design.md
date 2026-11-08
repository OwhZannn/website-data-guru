# Spesifikasi Fase 3 — Alur Pemeriksaan

Tanggal: 2026-11-08 · Status: sedang diimplementasi
Hubungan: [Rencana UI/UX](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) §3 Fase 3 §4 Keputusan
Memperbaiki temuan: R1–R5, N2, F2

---

## Tujuan

Menjadikan proses pemeriksaan dokumen guru secepat dan seakurat mungkin:
- Admin bisa melihat pratinjau Drive tanpa membuka tab baru.
- Keyboard shortcut memungkinkan keputusan SAH/Tolak tanpa angkat tangan dari keyboard.
- Alasan penolakan tersedia sebagai preset yang bisa diklik (dan diedit admin), sehingga konsistensi terjaga.
- Sahkan-massal memungkinkan persetujuan seluruh dokumen satu guru dalam satu klik.
- Halaman antrean memberikan gambaran lengkap semua dokumen yang menunggu di satu periode.
- Timeline riwayat yang lebih jelas dengan ikon dan lencana aktor.

---

## 1. Skema Database

### Model Baru: `AlasanTolak`

```prisma
model AlasanTolak {
  id         String   @id @default(cuid())
  teks       String
  urutan     Int      @default(0)
  aktif      Boolean  @default(true)
  dibuatPada DateTime @default(now())
}
```

Migrasi: `20261108_alasan_tolak` — berisi DDL + empat INSERT bawaan.
Produksi mendapat baris via SQL migrasi (bukan hanya seed), sehingga deployment awal sudah punya preset.

Seed (`prisma/seed.ts`) menambahkan keempat alasan bila tabel kosong (idempotent).

### Fallback Konstan

`src/lib/alasanTolak.ts` mengekspor `ALASAN_BAWAAN` (array teks) sebagai jaring pengaman bila tabel kosong.

---

## 2. API Baru

### `GET/POST /api/admin/alasan`

| Aksi | Method | Badan / Params |
|---|---|---|
| Daftar aktif | GET | — |
| Daftar semua (admin) | GET | `?semua=1` |
| Tambah | POST | `{ aksi: "tambah", teks }` |
| Ubah teks | POST | `{ aksi: "ubah", id, teks? }` |
| Aktifkan | POST | `{ aksi: "aktifkan", id }` |
| Nonaktifkan | POST | `{ aksi: "nonaktifkan", id }` |
| Urutkan | POST | `{ aksi: "urut", id, arah: "naik"|"turun" }` |

Semua aksi: admin saja, validasi Zod, pesan galat Bahasa Indonesia.

### `POST /api/admin/keputusan/massal`

Badan: `{ guruId, periodeId }`

Efek dalam satu `prisma.$transaction`:
- Ambil semua `DokumenGuru` berstatus `MENUNGGU` milik guru+periode dengan `fileId != null`.
- Update setiap baris ke `SAH`, tulis satu `Riwayat` per dokumen (aksi `sahkan`, `olehTipe: "admin"`).
- Kembalikan `{ ok: true, jumlah: N }`.

Admin saja; validasi Zod; pesan galat Bahasa Indonesia.

---

## 3. Komponen Baru

### `KelolaAlasan` (`src/components/KelolaAlasan.tsx`)

Client component, pola identik dengan `KelolaDokumen`:
- Form tambah (input teks, tombol Tambah).
- Daftar preset dengan tombol Aktifkan/Nonaktifkan dan Naik/Turun.
- Pesan galat inline; `router.refresh()` setelah sukses.

### `TombolKeputusan` (diperluas)

Properti baru: `alasanPreset: string[]`.

Saat mode `tolak` terbuka:
- Tampilkan chip (`.chip-alasan`) untuk setiap preset aktif di atas textarea.
- Klik chip: isi/tambahkan teks ke textarea alasan; chip tidak submit otomatis.
- Textarea tetap bisa diedit bebas; alasan yang disimpan tetap teks biasa.

### `SahkanMassal` (`src/components/SahkanMassal.tsx`)

Client component:
- Menerima daftar dokumen MENUNGGU dengan file.
- Tombol "Sahkan semua yang menunggu (n)" (n = jumlah dokumen).
- Buka `Konfirmasi` yang mendaftar nama dokumen yang terdampak.
- Kirim ke `/api/admin/keputusan/massal`; tampilkan Toast sukses; `router.refresh()`.

### `PanelPratinjau` (`src/components/PanelPratinjau.tsx`)

Client component:
- Menerima `fileId: string | null` dan `namaDokumen: string`.
- Render `<iframe>` dengan `src="https://drive.google.com/file/d/{fileId}/preview"`.
- Tombol "Buka di Drive" sebagai fallback (target `_blank`).
- Bila `fileId` null: tampilkan `EmptyState` "Belum ada file".
- Responsive: tampil di panel kiri ≥1024 px; toggle "Pratinjau" di mobile.

### `PintasanKeyboard` (`src/components/PintasanKeyboard.tsx`)

Client component:
- Menerima callback `onSahkan`, `onTolak`, `onBerikutnya`, `onSebelumnya`.
- Event listener `keydown` global (cleanup di unmount).
- Abaikan bila `e.target` adalah `INPUT`, `TEXTAREA`, `SELECT` atau modifier key.
- Peta: `S` → onSahkan, `T` → onTolak, `J` → onBerikutnya, `K` → onSebelumnya, `?` → toggle overlay bantuan.
- Overlay bantuan: `<dialog>` modal sederhana daftar shortcut.

### `TimelineRiwayat` (`src/components/TimelineRiwayat.tsx`)

Server component:
- Gantikan list `<ul>` lama di halaman detail guru.
- Setiap baris: garis vertikal + ikon Lucide (CheckCircle2, XCircle, Upload, RotateCcw, dll.), lencana aktor (`admin` / `guru`), waktu WITA.

### `Toast` (`src/components/Toast.tsx`)

Client component:
- `role="status"` `aria-live="polite"`.
- Muncul dari bawah layar, `auto-dismiss` 4 detik.
- `@media (prefers-reduced-motion: reduce)` → hilang instan tanpa animasi.
- Ekspor hook `useToast()` untuk memicu dari komponen lain.

---

## 4. Halaman Baru / Diperbarui

### `/admin/alasan` (pengganti placeholder)

Server component, mengambil semua `AlasanTolak`, render `KelolaAlasan`.

### `/admin/antrean` (diperluas)

Server component:
- Filter: jenis dokumen (`?dok=<dokumenId>`) + sekolah asal (`?sekolah=...`).
- Periode dari `?periode=` via `pilihPeriode()`.
- Paginasi via `potongHalaman()`.
- Setiap baris: link ke `/admin/guru/{guruId}?dok={dokumenGuruId}`.

### `/admin/guru/[id]` (diperluas)

Properti `searchParams` ditambah `dok?: string`:
- Server mengambil alasan preset aktif.
- Render `PanelPratinjau`, `PintasanKeyboard`, `SahkanMassal`, `TimelineRiwayat`.
- Split pane ≥1024 px: `.review-split` (CSS grid 2 kolom).

---

## 5. Pintasan Keyboard

| Tombol | Aksi |
|---|---|
| `S` | Sahkan dokumen terpilih |
| `T` | Buka panel tolak untuk dokumen terpilih |
| `J` | Pindah ke dokumen berikutnya (urutan wajib) |
| `K` | Pindah ke dokumen sebelumnya |
| `?` | Buka/tutup overlay bantuan |

Setelah keputusan: otomatis pindah ke dokumen MENUNGGU berikutnya.
Bila tidak ada lagi: tampilkan "Guru berikutnya ›" (teacher berikutnya dengan dokumen menunggu di periode sama) dan "Kembali ke antrean".

---

## 6. Toast & Aksesibilitas

- Toast: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`.
- Fokus tetap di tempat saat toast muncul.
- Overlay pintasan: `<dialog>`, `Escape` menutup.
- Konfirmasi sahkan-massal: daftar nama dokumen agar admin tahu dampaknya.

---

## 7. Keputusan Implementasi

| Topik | Keputusan |
|---|---|
| Alasan disimpan | Teks biasa di `DokumenGuru.alasan` — tidak ada FK ke `AlasanTolak`. |
| Preset sumber | Dari DB; fallback ke `ALASAN_BAWAAN` bila tabel kosong. |
| Split pane | CSS Grid, bukan library. |
| Pratinjau Drive | `<iframe>` Drive embed; bukan membuka tab baru secara paksa. |
| Auto-advance | Client-side: router.push ke `?dok=<id berikutnya>`. |
| Guru berikutnya | Query DB: guru dengan dokumen MENUNGGU paling lama di periode sama. |
| e2e / DRIVE_PALSU | Iframe src tetap diset; tes tidak memvalidasi konten Drive. |
| Bulk approve | `prisma.$transaction` di satu endpoint; reuse logika `sahkanDokumen`. |

---

## 8. Tes

### Unit / Integrasi (Vitest)

- `tests/api/alasan.test.ts`: CRUD + reorder + auth.
- `tests/api/keputusanMassal.test.ts`: bulk approve, kasus tanpa file, kasus kosong.

### e2e (Playwright)

- Chip preset mengisi alasan dan tolak berhasil.
- Sahkan massal (Konfirmasi → kirim → toast sukses).
- Shortcut `S` menyahkan dan auto-advance (viewport 1280 × 800).
- `/admin/alasan` tambah dan nonaktifkan preset.
