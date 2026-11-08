# Spesifikasi Fase 2 — Beranda Admin

Tanggal: 2026-11-08 · Status: selesai
Hubungan: [Rencana UI/UX](../plans/2026-11-08-dashboard-ui-ux-audit-and-plan.md) §1.2 A1–A6, §2, §3 Fase 2

---

## Tujuan

Mengubah beranda admin dari halaman hampir kosong menjadi *pusat kendali*: dalam 5 detik admin memahami kondisi periode aktif dan tahu langkah selanjutnya. Semua angka konsisten dengan halaman Guru (filter berlaku sama).

---

## Komponen Yang Dipakai (dari `src/components/ui/`)

| Komponen | Peran di halaman |
|---|---|
| `StatCard` | Kartu angka: Total guru aktif, Lengkap, Menunggu diperiksa, Ada ditolak, Belum mulai |
| `Section` | Pembungkus setiap blok (Antrean, Aktivitas, Per dokumen) dengan judul + slot aksi |
| `ProgressBar` | Bar bertumpuk per status untuk periode |
| `EmptyState` | Tampilan bila tidak ada periode |
| `Badge` | Label status di antrean dan aktivitas |

---

## Fungsi Data (`src/lib/dasbor.ts`)

### `ringkasanDasbor(periodeId: string)`

Satu fungsi async yang mengembalikan `RingkasanDasbor`:

```ts
type RingkasanDasbor = {
  jumlahGuruAktif: number          // guru.aktif = true && guru.disetujui = true
  statusGuru: {
    lengkap: number
    perluDicek: number             // label "Perlu dicek" → filter perlu-dicek
    adaDitolak: number             // label "Ada yang ditolak" → filter ada-ditolak
    belumMulai: number             // label "Belum mulai" → filter belum-mulai
  }
  statusDokumen: {                 // seluruh DokumenGuru pada periode ini
    sah: number
    menunggu: number
    ditolak: number
  }
  perDokumen: {                    // satu entri per DaftarDokumen aktif
    id: string
    nama: string
    sah: number
    menunggu: number
    ditolak: number
    belum: number                  // jumlahGuruAktif - sah - menunggu - ditolak
  }[]
  antrean: {                       // DokumenGuru MENUNGGU, diurutkan menurut waktu terlama
    dokumenGuruId: string
    guruId: string
    namGuru: string
    namaDokumen: string
    menungguSejak: Date            // waktu Riwayat 'unggah'/'ganti_file' terbaru, atau updatedAt
  }[]
  totalAntrean: number             // total DokumenGuru MENUNGGU (bukan hanya 10)
  perluPersetujuan: number         // guru.disetujui = false
  aktivitasTerbaru: {              // 15 Riwayat terbaru
    id: string
    aksi: string
    waktu: Date
    namaPelaku: string
    namaDokumen: string | null
    namaGuru: string | null
    periodeId: string
  }[]
}
```

**Strategi kueri (tanpa N+1):**

1. `prisma.guru.findMany` → semua guru aktif+disetujui; hitung status per guru dengan `hitungStatusGuru` (sama dengan halaman Guru).
2. `prisma.daftarDokumen.findMany` → dokumen aktif pada periode.
3. `prisma.dokumenGuru.groupBy(['dokumenId', 'status'])` → pivot per-dokumen.
4. `prisma.dokumenGuru.findMany(MENUNGGU, include: riwayat terbaru)` → antrean, kemudian sort di memori.
5. `prisma.riwayat.findMany` → 15 baris + `namaPelakuRiwayat` (2 kueri massal).

---

## Halaman (`src/app/admin/page.tsx`)

### Parameter URL

`?periode=<id>` — dikirim oleh pemilih periode di header AdminShell. Diproses dengan `semuaPeriode()` + `pilihPeriode(daftar, sp.periode)`. Bila tidak ada periode sama sekali, tampilkan `EmptyState`.

### Struktur Halaman

```
<BannerDrive />
<h1>Beranda Admin</h1>

[Jika tidak ada periode]
<EmptyState ikon=<FolderOpen/> teks="Belum ada periode" aksi=<a href="/admin/periode">Buat periode</a> />

[Jika ada periode]
<p class="redup">Periode: <strong>nama</strong></p>

<!-- Baris stat cards -->
<div class="stat-baris">
  <StatCard nilai={jumlahGuruAktif}  label="Total guru aktif"      href="/admin/guru?periode=…" />
  <StatCard nilai={statusGuru.lengkap}    label="Lengkap"          warna="sah"   href="/admin/guru?status=lengkap&periode=…" />
  <StatCard nilai={statusGuru.perluDicek} label="Menunggu diperiksa" warna="tunggu" href="/admin/guru?status=perlu-dicek&periode=…" />
  <StatCard nilai={statusGuru.adaDitolak} label="Ada yang ditolak" warna="tolak" href="/admin/guru?status=ada-ditolak&periode=…" />
  <StatCard nilai={statusGuru.belumMulai} label="Belum mulai"      warna="belum" href="/admin/guru?status=belum-mulai&periode=…" />
</div>

<!-- Progress bar bertumpuk -->
<Section judul="Progres periode">
  <ProgressBar segmen=[sah, tunggu, tolak, belum] />
  <p>X% lengkap (N dari M guru)</p>
</Section>

<!-- Dua kolom tengah (desktop) -->
<div class="dua-kolom">
  <!-- Antrean pemeriksaan -->
  <Section judul="Antrean pemeriksaan" aksi=<a href="/admin/antrean">Lihat semua</a>>
    <table>…nama guru, dokumen, lama tunggu (relatif, misal "3 hari"), link ke /admin/guru/[id]</table>
  </Section>

  <!-- Perlu persetujuan -->
  <div class="kartu">
    <p>N guru belum disetujui</p>
    <a href="/admin/guru?status=menunggu">Tinjau</a>
  </div>

  <!-- Aktivitas terbaru -->
  <Section judul="Aktivitas terbaru">
    <ul class="aktivitas">…timeline baris riwayat</ul>
  </Section>
</div>

<!-- Per dokumen -->
<Section judul="Per dokumen" aksi=<details>Unduh XLSX/CSV</details>>
  {perDokumen.map(…bar per dokumen)}
</Section>
```

### Responsivitas

- Mobile (< 1024 px): satu kolom; stat cards `grid-template-columns: repeat(2, 1fr)`.
- Desktop (≥ 1024 px): stat cards 5 kolom; dua-kolom tengah berdampingan.

### Waktu Relatif

Fungsi `selisihWaktuIndonesia(sejak: Date): string` di `src/lib/waktu.ts`: mengembalikan "X menit", "X jam", "X hari", atau "X minggu" lalu.

---

## Tes

### Unit (`tests/lib/dasbor.test.ts`)

- Jumlah guru per status sesuai `hitungStatusGuru`.
- Antrean diurutkan dari yang paling lama menunggu.
- `totalAntrean` mencakup semua, bukan hanya 10.
- `perluPersetujuan` menghitung `disetujui = false`.
- `perDokumen.belum` = `jumlahGuruAktif - sah - menunggu - ditolak`.

### E2E (`tests/e2e/beranda-admin.spec.ts`)

- Stat cards terlihat dan link mengarah ke `/admin/guru?status=…&periode=…`.
- Bila tidak ada periode: `EmptyState` tampil dan link mengarah ke `/admin/periode`.

---

## Keputusan Semantik

| Pertanyaan | Keputusan |
|---|---|
| Siapa yang masuk "aktif"? | `guru.aktif = true && guru.disetujui = true` |
| Bagaimana menentukan status guru? | `hitungStatusGuru` (sumber kebenaran tunggal, sama dengan filter halaman Guru) |
| `menungguSejak` antrean? | Waktu Riwayat aksi `unggah`/`ganti_file` terbaru; fallback: `updatedAt` DokumenGuru |
| Pemilihan periode? | `semuaPeriode()` + `pilihPeriode(daftar, sp.periode)` |
| Unduh rekap? | `<details>` dropdown di slot aksi Section "Per dokumen" |
