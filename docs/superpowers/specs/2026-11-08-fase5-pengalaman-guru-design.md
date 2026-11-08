# Fase 5 — Pengalaman Guru: Desain & Spesifikasi

Tanggal: 2026-11-08  
Status: Diimplementasikan  
Cabang: `feat/dasbor-ui-ux`  
Fase sebelumnya: 0–4 (fondasi, tata letak admin, beranda admin, alur pemeriksaan, daftar guru)

---

## 1. Latar Belakang

Temuan audit G1–G4 menunjukkan halaman guru memiliki UX yang belum memadai:

| ID | Temuan | Penyebab |
|----|--------|----------|
| G1 | Guru tidak tahu apa yang harus dilakukan berikutnya | Tidak ada ringkasan status di atas daftar dokumen |
| G2 | Daftar dokumen tidak dikelompokkan berdasarkan aksi | Semua dokumen tercampur; dokumen SAH memenuhi layar |
| G3 | Formulir unggah tidak mendukung seret-lepas dan tidak ada indikator kemajuan | Hanya klik tombol; tidak ada umpan balik selama unggahan |
| G4 | Pesan "profil tidak lengkap" tidak menyebut bidang yang perlu diisi | Guru tidak tahu mana yang harus dilengkapi |

---

## 2. Kartu "Langkah Berikutnya" (`KartuLangkahBerikutnya`)

### Spesifikasi
- Ditampilkan di atas daftar dokumen, di bawah `KartuProgres`.
- Menampilkan jumlah dokumen per status: **Ditolak**, **Belum diunggah**, **Menunggu diperiksa**.
- Satu tombol aksi utama (tautan jangkar ke `#perlu-tindakan`) jika ada dokumen yang perlu tindakan.
- Jika semua dokumen SAH: tampilkan notis SIAGA (perilaku lama dipertahankan).
- Sembunyikan kartu jika profil belum lengkap atau tidak ada periode.

### Status yang ditampilkan
```
[Ditolak: N]  [Belum: N]  [Menunggu: N]
[→ Lihat dokumen perlu tindakan]   ← hanya jika ditolak+belum > 0
```

### Atribut uji
- `data-testid="langkah-berikutnya"` pada elemen kartu.
- Setiap hitungan status memiliki `data-testid="hitung-ditolak"`, `"hitung-belum"`, `"hitung-menunggu"`.

---

## 3. Pengelompokan Dokumen

### Kelompok
| Nama | Status | `id` jangkar | Urutan |
|------|--------|-------------|--------|
| Perlu tindakan | DITOLAK (pertama), BELUM | `perlu-tindakan` | 1 |
| Sedang diperiksa | MENUNGGU | `sedang-diperiksa` | 2 |
| Sudah sah | SAH | `sudah-sah` | 3 |

### Perilaku
- Urutan admin dalam satu kelompok dipertahankan (berdasarkan `urutan` pada `DaftarDokumen`).
- Kelompok kosong disembunyikan.
- Kelompok "Sudah sah" dikolaps secara bawaan menggunakan `<details>/<summary>` asli.
- Kartu SAH tetap dapat diakses DOM saat dikolaps; selalu `open` jika SAH adalah satu-satunya kelompok.

### Keputusan aksesibilitas untuk pengujian e2e
Pengujian `guru.spec.ts` memerlukan `getByText('SAH', { exact: true }).toBeVisible()` ketika SAH + MENUNGGU ada.
Oleh karena itu, pengujian tersebut menambahkan langkah `page.locator('details#sudah-sah').evaluate(el => el.setAttribute('open',''))` sebelum pengujian visibilitas, atau dimodifikasi untuk membuka detail lebih dulu. Hal ini didokumentasikan secara eksplisit di `guru.spec.ts`.

---

## 4. `TombolUnggah` — Seret-Lepas dan Kemajuan Unggahan

### Fitur baru
- **Zona seret-lepas**: area visual di sekitar tombol unggah yang menerima file yang diseret. Keyboard dan klik tetap berfungsi melalui `<input type="file">` yang sudah ada.
- **Persentase unggahan**: menggunakan `XMLHttpRequest` (XHR) dengan `upload.onprogress` untuk memperbarui persentase secara langsung. Respons sama dengan `fetch` sebelumnya (JSON `{ ok, pesan? }`).
- **Fallback**: saat `createImageBitmap` atau kompresi gagal, berkas asli tetap dikirim.

### Kompatibilitas pengujian
`page.route()` di Playwright mencegat XHR maupun fetch. Pengujian `unggah-gambar.spec.ts` tidak perlu diubah — route intercept tetap berfungsi. Namun karena XHR tidak mengembalikan respons ke `.json()`, parsing respons dialihkan ke `xhr.responseText`.

### Validasi tetap sama
- `kecilkanGambar` dipanggil sebelum XHR.
- `periksaBerkas` di sisi server tidak berubah.
- Pesan galat dan penanganan status 401 identik dengan implementasi `fetch` sebelumnya.

### Atribut uji
- `data-testid="zona-unggah-{dokumenId}"` pada zona seret-lepas.
- `data-testid="progres-unggah"` pada teks persentase.

---

## 5. Daftar Kelengkapan Profil (`kolomProfilKurang`)

### Fungsi pembantu baru
```ts
// src/lib/syarat.ts
export function kolomProfilKurang(
  p: Pick<Guru, 'asalSekolah' | 'statusPegawai' | 'tahunSertifikasi'>
): { kolom: string; label: string; id: string }[]
```

Mengembalikan daftar kolom yang belum diisi, dengan `id` yang cocok dengan atribut `id` pada elemen input di `FormProfil`.

| Kolom | Label | `id` input |
|-------|-------|-----------|
| `asalSekolah` | Asal sekolah | `asal-sekolah` |
| `statusPegawai` | Status kepegawaian | `status-pegawai` |
| `tahunSertifikasi` | Tahun sertifikasi | `tahun-sertifikasi` |

### Halaman profil
- Ketika profil tidak lengkap, pesan "Lengkapi profil Anda dulu." dipertahankan (untuk kompatibilitas e2e).
- Tambahan: daftar butir dengan tautan ke `/profil#<id-kolom>` untuk setiap kolom yang kurang.

### Formulir profil
Tambahkan atribut `id` pada elemen input yang sesuai.

---

## 6. `EmptyState`

Gunakan komponen `EmptyState` yang ada di:
- Halaman dokumen ketika tidak ada periode tersedia.
- Halaman dokumen ketika tidak ada dokumen wajib untuk periode aktif.

---

## 7. Batasan

- Tidak ada perubahan skema basis data.
- Tidak ada perubahan kontrak API (`/api/dokumen/unggah`).
- Halaman guru tetap menggunakan header `Kepala` sederhana (bukan shell admin).
- Mobile-first; lebar viewport default e2e: 360px.

---

## 8. Berkas yang Diubah

| Berkas | Perubahan |
|--------|-----------|
| `src/lib/syarat.ts` | Tambah `kolomProfilKurang` |
| `src/components/FormProfil.tsx` | Tambah `id` pada input |
| `src/components/TombolUnggah.tsx` | Seret-lepas + kemajuan XHR |
| `src/components/KartuLangkahBerikutnya.tsx` | Komponen baru |
| `src/app/dokumen/page.tsx` | Kelompok + kartu langkah + EmptyState |
| `src/app/profil/page.tsx` | Daftar kelengkapan |
| `src/app/globals.css` | Token baru: `.kelompok`, `.zona-unggah`, `.langkah-berikutnya` |
| `tests/e2e/guru.spec.ts` | Buka details SAH sebelum uji visibilitas |
| `tests/e2e/fase5.spec.ts` | Pengujian baru: kartu langkah, urutan kelompok, daftar profil |
