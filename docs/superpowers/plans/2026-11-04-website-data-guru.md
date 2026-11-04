# Website Data Guru Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun website tempat ~300 guru mengunggah dokumen persyaratan (PDF/JPG) ke Google Drive, dan admin memverifikasi tiap dokumen dengan menyahkan atau menolaknya disertai alasan.

**Architecture:** Aplikasi Next.js (App Router) satu proses, menyajikan halaman server-rendered dan route handler di bawah `/api`. Data disimpan di SQLite lewat Prisma. File dokumen tidak pernah disimpan di server: setiap unggahan diteruskan ke Google Drive memakai OAuth2 dengan refresh token pada akun Gmail pemilik Drive, dan yang disimpan di basis data hanya `fileId`-nya. Status "Terverifikasi" tidak pernah disimpan — selalu dihitung dari keadaan dokumen periode itu, supaya tidak bisa berbeda dari kenyataan.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Prisma · SQLite · `zod` · `googleapis` · `vitest` · Playwright · Docker Compose · nginx + Let's Encrypt

**Spec:** `docs/superpowers/specs/2026-11-04-website-data-guru-design.md`

## Global Constraints

Nilai-nilai ini berlaku di **setiap** task dan disalin dari rancangan:

- Satu jenis dokumen berisi **tepat satu file**. Tidak ada status per halaman.
- Format file hanya **PDF dan JPG**. Ukuran maksimal **5 MB** per file.
- Penolakan dan pembatalan keputusan **wajib** disertai alasan tidak kosong. Sistem harus menolak menyimpan tanpa alasan.
- Dokumen berstatus **sah** tidak bisa disentuh guru. Hanya admin lewat pembatalan.
- Akun guru dan admin **tidak pernah dihapus**, hanya dinonaktifkan (`aktif = false`).
- Dokumen pada daftar induk **tidak pernah dihapus**, hanya dinonaktifkan.
- Status **Terverifikasi tidak disimpan sebagai kolom**. Selalu dihitung ulang.
- Setiap baris data terikat pada satu **periode**. Tidak ada kueri lintas periode kecuali untuk riwayat.
- Semua teks antarmuka berbahasa Indonesia.
- Aplikasi OAuth Google **wajib berstatus Published**, bukan Testing (lihat Task 8).
- Rahasia (client secret, session secret) **tidak pernah masuk git**. Hanya lewat variabel lingkungan.

## Review Focus

Lima hal yang tidak diuji langsung oleh task mana pun, tapi paling mungkin menggigit pemakai, diurutkan dari yang paling mungkin:

1. **Guru mengunggah file yang bukan PDF/JPG tapi hanya mengganti ekstensinya.** Harapan wajar: sistem menolak berdasarkan isi file, bukan namanya. Kalau lolos, Drive akan menyimpan file rusak yang baru ketahuan berbulan-bulan kemudian.
2. **Nama guru mengandung karakter yang tidak sah untuk nama folder Drive** (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) atau panjang berlebihan. Harapan wajar: folder tetap terbentuk dan nama tetap bisa dibaca. Kalau gagal, unggahan guru itu mati total.
3. **Dua admin memutuskan dokumen yang sama pada saat yang hampir bersamaan.** Harapan wajar: tidak ada keputusan yang hilang diam-diam; keputusan terakhir menang dan **keduanya** tercatat di riwayat.
4. **Admin menambah dokumen baru ke daftar saat sudah banyak guru terverifikasi.** Harapan wajar: admin diberi tahu berapa guru yang akan kembali tidak lengkap, dan diminta konfirmasi sebelum daftarnya berubah.
5. **Google Drive menolak permintaan di tengah proses** (refresh token dicabut, kuota habis, jaringan putus) tepat setelah file terunggah tapi sebelum baris basis data tersimpan. Harapan wajar: guru melihat pesan gagal yang jujur, dan tidak diklaim berhasil. Kalau salah, guru mengira dokumennya masuk padahal tidak ada.

---

### Task 1: Kerangka proyek dan basis data

Menyiapkan proyek Next.js yang bisa dibangun, dengan skema lengkap dan migrasi pertama. Daftar dokumen bawaan dimasukkan lewat *seed* supaya data contoh tidak ikut ke produksi.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Test: `tests/lib/db.test.ts`

**Interfaces:**
- Consumes: tidak ada
- Produces: `prisma` (instance tunggal, dari `src/lib/db.ts`) — dipakai seluruh task berikutnya. Model Prisma: `Admin`, `Guru`, `Periode`, `DaftarDokumen`, `DokumenGuru`, `Riwayat`, `Sesi`.

- [ ] **Step 1: Inisialisasi proyek**

```bash
npm init -y
npm install next@15 react@19 react-dom@19 @prisma/client zod googleapis
npm install -D typescript @types/node @types/react prisma vitest dotenv
npx tsc --init
```

- [ ] **Step 2: Tulis skema Prisma**

Tulis `prisma/schema.prisma` dengan `provider = "sqlite"`. Model dan kolomnya sudah ditetapkan rancangan, jadi ini bukan pilihan Anda:

```prisma
model Admin {
  id         String   @id @default(cuid())
  nama       String
  email      String   @unique
  hashSandi  String
  aktif      Boolean  @default(true)
  dibuatPada DateTime @default(now())
}

model Guru {
  id         String   @id @default(cuid())
  nama       String
  nip        String   @unique
  email      String   @unique
  hashSandi  String
  aktif      Boolean  @default(true)
  dibuatPada DateTime @default(now())
  dokumen    DokumenGuru[]
}

model Periode {
  id         String   @id @default(cuid())
  nama       String
  dibuka     Boolean  @default(false)
  dibuatPada DateTime @default(now())
  dokumen    DaftarDokumen[]
  dokumenGuru DokumenGuru[]
}

model DaftarDokumen {
  id        String  @id @default(cuid())
  periodeId String
  periode   Periode @relation(fields: [periodeId], references: [id])
  nama      String
  urutan    Int
  aktif     Boolean @default(true)
  dokumenGuru DokumenGuru[]
}

enum StatusDokumen {
  BELUM
  MENUNGGU
  SAH
  DITOLAK
}

model DokumenGuru {
  id            String        @id @default(cuid())
  periodeId     String
  periode       Periode       @relation(fields: [periodeId], references: [id])
  guruId        String
  guru          Guru          @relation(fields: [guruId], references: [id])
  dokumenId     String
  dokumen       DaftarDokumen @relation(fields: [dokumenId], references: [id])
  fileId        String?
  namaFile      String?
  tipe          String?
  ukuran        Int?
  status        StatusDokumen @default(BELUM)
  alasan        String?
  diperiksaOleh String?
  diperiksaPada DateTime?
  diunggahPada  DateTime?
  @@unique([periodeId, guruId, dokumenId])
}

model Riwayat {
  id        String   @id @default(cuid())
  waktu     DateTime @default(now())
  periodeId String
  guruId    String?
  dokumenId String?
  aksi      String
  alasan    String?
  oleh      String
  olehTipe  String
}

model Sesi {
  token      String   @id
  pemilikId  String
  tipe       String
  kedaluwarsa DateTime
}

model PercobaanMasuk {
  kunci String   @id
  gagal Int      @default(0)
  sejak DateTime
}
```

Catatan SQLite: Prisma tidak mendukung `enum` pada SQLite. Ganti `enum StatusDokumen` menjadi `status String @default("BELUM")` dan validasi nilainya di lapisan aplikasi dengan `zod`.

- [ ] **Step 3: Jalankan migrasi pertama**

```bash
npx prisma migrate dev --name init
```
Expected: `prisma/migrations/` terbentuk, dan `prisma/dev.db` ada.

- [ ] **Step 4: Tulis instance Prisma tunggal**

`src/lib/db.ts` mengekspor `prisma: PrismaClient`. Pakai pola singleton (`globalThis.prisma ??= new PrismaClient()`) supaya hot-reload pengembangan tidak membuka koneksi baru setiap kali.

- [ ] **Step 5: Tulis test yang gagal**

Test ini membuktikan instance tunggal benar-benar tunggal — kesalahan paling umum di langkah ini:

```ts
// tests/lib/db.test.ts
import { describe, it, expect } from 'vitest'
import { prisma } from '../../src/lib/db'

describe('instance prisma', () => {
  it('sama setiap kali diimpor', async () => {
    const { prisma: lagi } = await import('../../src/lib/db')
    expect(lagi).toBe(prisma)
  })

  it('bisa membaca model Periode', async () => {
    const jumlah = await prisma.periode.count()
    expect(typeof jumlah).toBe('number')
  })
})
```

- [ ] **Step 6: Jalankan test, pastikan gagal**

Run: `npx vitest run tests/lib/db.test.ts`
Expected: FAIL — `Cannot find module '../../src/lib/db'`

- [ ] **Step 7: Jalankan test, pastikan lulus**

Run: `npx vitest run tests/lib/db.test.ts`
Expected: PASS, 2 test lulus

- [ ] **Step 8: Tulis seed daftar dokumen bawaan**

`prisma/seed.ts` membuat satu `Periode` contoh beserta lima `DaftarDokumen`: "Ijazah S1", "Transkrip Nilai", "SK Mengajar", "Sertifikat Pendidik", "Kartu Pegawai". Daftar ini **bukan** daftar resmi — ia hanya contoh supaya pengembangan bisa berjalan; daftar sungguhan diisi admin lewat Task 11.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: kerangka proyek, skema prisma, dan seed daftar dokumen"
```

---

### Task 2: Otentikasi dan sesi

Login admin dan guru memakai email + kata sandi, sesi disimpan di tabel `Sesi` dan ditandai cookie `httpOnly`. Satu modul menangani keduanya, dibedakan oleh `tipe`.

**Files:**
- Create: `src/lib/sandi.ts`, `src/lib/sesi.ts`, `src/lib/auth.ts`
- Create: `src/app/api/auth/masuk/route.ts`, `src/app/api/auth/keluar/route.ts`
- Test: `tests/lib/sandi.test.ts`, `tests/lib/sesi.test.ts`

**Interfaces:**
- Consumes: `prisma` dari Task 1
- Produces:
  - `hashSandi(sandi: string): Promise<string>`
  - `periksaSandi(sandi: string, hash: string): Promise<boolean>`
  - `buatSesi(pemilikId: string, tipe: 'guru' | 'admin'): Promise<string>` — mengembalikan token, masa berlaku 14 hari
  - `bacaSesi(token: string): Promise<{ pemilikId: string; tipe: 'guru' | 'admin' } | null>`
  - `hapusSesi(token: string): Promise<void>`
  - `wajibAdmin(): Promise<Admin>` dan `wajibGuru(): Promise<Guru>` — melempar `Response` 401 bila tidak sah
  - `catatRiwayat(...)` ada di Task 5, bukan di sini

- [ ] **Step 1: Tulis test hashing yang gagal**

```ts
// tests/lib/sandi.test.ts
import { describe, it, expect } from 'vitest'
import { hashSandi, periksaSandi } from '../../src/lib/sandi'

describe('sandi', () => {
  it('tidak menyimpan sandi apa adanya', async () => {
    const hash = await hashSandi('rahasia123')
    expect(hash).not.toContain('rahasia123')
  })

  it('menerima sandi yang benar', async () => {
    const hash = await hashSandi('rahasia123')
    expect(await periksaSandi('rahasia123', hash)).toBe(true)
  })

  it('menolak sandi yang salah', async () => {
    const hash = await hashSandi('rahasia123')
    expect(await periksaSandi('rahasia124', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run tests/lib/sandi.test.ts`
Expected: FAIL — module tidak ditemukan

- [ ] **Step 3: Implementasikan `hashSandi` dan `periksaSandi` di `src/lib/sandi.ts`**

Pakai `scrypt` dari `node:crypto` (tidak perlu dependensi tambahan). Format simpanan: `scrypt$<garam-hex>$<turunan-hex>`. `periksaSandi` wajib memakai perbandingan waktu-tetap (`timingSafeEqual`).

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run tests/lib/sandi.test.ts`
Expected: PASS, 3 test lulus

- [ ] **Step 5: Tulis test sesi yang gagal**

```ts
// tests/lib/sesi.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { buatSesi, bacaSesi, hapusSesi } from '../../src/lib/sesi'

describe('sesi', () => {
  beforeEach(async () => { await prisma.sesi.deleteMany() })

  it('mengembalikan pemilik dan tipe untuk token yang sah', async () => {
    const token = await buatSesi('guru-1', 'guru')
    expect(await bacaSesi(token)).toEqual({ pemilikId: 'guru-1', tipe: 'guru' })
  })

  it('menolak token yang tidak dikenal', async () => {
    expect(await bacaSesi('token-palsu')).toBeNull()
  })

  it('menolak token yang sudah dihapus', async () => {
    const token = await buatSesi('guru-1', 'guru')
    await hapusSesi(token)
    expect(await bacaSesi(token)).toBeNull()
  })
})
```

- [ ] **Step 6: Jalankan, pastikan gagal** — `npx vitest run tests/lib/sesi.test.ts` → FAIL

- [ ] **Step 7: Implementasikan sesi**

`buatSesi` memakai `randomBytes(32).toString('hex')` sebagai token dan menyimpan `kedaluwarsa = now + 14 hari`. `bacaSesi` mengembalikan `null` bila baris tidak ada **atau** sudah lewat kedaluwarsa — kedaluwarsa diperiksa di sini, bukan saat pembersihan, supaya tidak ada celah.

- [ ] **Step 8: Jalankan, pastikan lulus** — `npx vitest run tests/lib/sesi.test.ts` → PASS, 3 test lulus

- [ ] **Step 9: Implementasikan helper auth**

`src/lib/auth.ts` mengekspor `wajibAdmin()` dan `wajibGuru()` yang membaca cookie `sesi`, memanggil `bacaSesi`, lalu mengambil barisnya dari tabel yang sesuai. Bila kosong atau `aktif === false`, lempar `new Response(null, { status: 401 })`. Ini satu-satunya tempat pemeriksaan itu ditulis; seluruh route handler memanggilnya.

- [ ] **Step 10: Implementasikan route masuk dan keluar**

`POST /api/auth/masuk` menerima `{ email, sandi }`, memeriksa dengan `zod`, mencari **admin lebih dulu** lalu guru, dan menyetel cookie `sesi` (`httpOnly`, `sameSite: 'lax'`, `secure` bila produksi, `maxAge` 14 hari). `POST /api/auth/keluar` memanggil `hapusSesi` dan menghapus cookie.

Catatan penting: bila email ada di kedua tabel, admin yang menang. Ini tidak mungkin terjadi dalam praktik (email admin berbeda), tetapi urutannya ditetapkan di sini supaya tidak jadi tebakan.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: otentikasi email+sandi dan sesi berbasis cookie"
```

---

### Task 3: Pembatasan percobaan masuk

Tanpa ini, 300 akun dengan kata sandi awal yang dibagikan lewat pesan pribadi adalah sasaran empuk. Brute force dibatasi per email.

**Files:**
- Create: `src/lib/pembatas.ts`
- Modify: `src/app/api/auth/masuk/route.ts`
- Test: `tests/lib/pembatas.test.ts`

**Interfaces:**
- Consumes: tidak ada
- Produces:
  - `catatGagalMasuk(kunci: string): Promise<void>`
  - `bolehCobaMasuk(kunci: string): Promise<boolean>` — `false` bila sudah 5 kegagalan dalam 15 menit terakhir
  - `bersihkanGagalMasuk(kunci: string): Promise<void>` — dipanggil saat login berhasil
  - `kunciMasuk(email: string): string` — `"masuk:{email.toLowerCase()}"`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/lib/pembatas.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { catatGagalMasuk, bolehCobaMasuk, bersihkanGagalMasuk, kunciMasuk } from '../../src/lib/pembatas'

describe('pembatas masuk', () => {
  const kunci = kunciMasuk('Guru@Contoh.id')
  beforeEach(async () => { await bersihkanGagalMasuk(kunci) })

  it('mengizinkan sebelum ada kegagalan', async () => {
    expect(await bolehCobaMasuk(kunci)).toBe(true)
  })

  it('menolak setelah lima kegagalan', async () => {
    for (let i = 0; i < 5; i++) await catatGagalMasuk(kunci)
    expect(await bolehCobaMasuk(kunci)).toBe(false)
  })

  it('kembali mengizinkan setelah dibersihkan', async () => {
    for (let i = 0; i < 5; i++) await catatGagalMasuk(kunci)
    await bersihkanGagalMasuk(kunci)
    expect(await bolehCobaMasuk(kunci)).toBe(true)
  })

  it('menyamakan email tanpa memandang besar-kecil huruf', () => {
    expect(kunciMasuk('Guru@Contoh.id')).toBe(kunciMasuk('guru@contoh.id'))
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/pembatas.test.ts` → FAIL

- [ ] **Step 3: Implementasikan pembatas**

Simpan di tabel `PercobaanMasuk` Prisma (dari Task 1), dengan `kunci` sebagai kunci utama. Kolom `gagal` menghitung kegagalan dan `sejak` menyimpan stempel waktu kegagalan **pertama** dalam jendela berjalan. Jendela 15 menit: bila `Date.now() - sejak` lebih dari 15 menit, hitungan dimulai ulang dari 1 dan `sejak` diperbarui. Ambang 5 kegagalan.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/pembatas.test.ts` → PASS, 4 test lulus

- [ ] **Step 5: Pasang ke route masuk**

Di `src/app/api/auth/masuk/route.ts`, sebelum memeriksa sandi: `if (!(await bolehCobaMasuk(kunciMasuk(email)))) return new Response(null, { status: 429 })`. Sesudah gagal: `catatGagalMasuk`. Sesudah berhasil: `bersihkanGagalMasuk`.

- [ ] **Step 6: Tambahkan test alur pembatasan**

Tambahkan ke `tests/lib/pembatas.test.ts` satu test yang memanggil `POST` route masuk enam kali dengan sandi salah lewat `fetch` terhadap server pengembangan, lalu memastikan panggilan keenam menghasilkan `429`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pembatasan lima percobaan masuk per 15 menit"
```

---

### Task 4: Perhitungan status guru

Satu fungsi murni yang menjawab "apakah guru ini lengkap di periode ini". Karena Terverifikasi tidak pernah disimpan, inilah satu-satunya sumber kebenarannya — dan karena ia murni, ia bisa diuji tanpa basis data.

**Files:**
- Create: `src/lib/status.ts`
- Test: `tests/lib/status.test.ts`

**Interfaces:**
- Consumes: tipe `DokumenGuru` dan `DaftarDokumen` dari Prisma
- Produces:
  - `hitungStatusGuru(dokumenAktif: DaftarDokumen[], dokumenGuru: DokumenGuru[]): StatusGuru`
  - `type StatusGuru = { lengkap: boolean; jumlahSah: number; jumlahWajib: number; adaDitolak: boolean; label: 'Belum mulai' | 'Perlu dicek' | 'Ada yang ditolak' | 'Lengkap' }`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/lib/status.test.ts
import { describe, it, expect } from 'vitest'
import { hitungStatusGuru } from '../../src/lib/status'

const daftar = [1,2,3,4,5].map(i => ({ id: `d${i}`, nama: `Dok ${i}`, urutan: i, aktif: true, periodeId: 'p1' }))
const satu = (dokumenId: string, status: string) => ({ dokumenId, status } as any)

describe('hitungStatusGuru', () => {
  it('menghitung nol dari lima saat belum ada unggahan', () => {
    const h = hitungStatusGuru(daftar as any, [])
    expect(h).toMatchObject({ lengkap: false, jumlahSah: 0, jumlahWajib: 5, label: 'Belum mulai' })
  })

  it('menandai ada yang ditolak walau sebagian sudah sah', () => {
    const h = hitungStatusGuru(daftar as any, [satu('d1','SAH'), satu('d2','DITOLAK')])
    expect(h).toMatchObject({ lengkap: false, jumlahSah: 1, adaDitolak: true, label: 'Ada yang ditolak' })
  })

  it('menandai perlu dicek saat ada yang menunggu', () => {
    const h = hitungStatusGuru(daftar as any, [satu('d1','SAH'), satu('d2','MENUNGGU')])
    expect(h).toMatchObject({ adaDitolak: false, label: 'Perlu dicek' })
  })

  it('menyatakan lengkap hanya bila kelimanya sah', () => {
    const semua = daftar.map(d => satu(d.id, 'SAH'))
    expect(hitungStatusGuru(daftar as any, semua)).toMatchObject({ lengkap: true, jumlahSah: 5, label: 'Lengkap' })
  })

  it('mengabaikan dokumen yang sudah dinonaktifkan', () => {
    const denganNonaktif = [...daftar, { id: 'd9', nama: 'Dok Lama', urutan: 9, aktif: false, periodeId: 'p1' }]
    const h = hitungStatusGuru(denganNonaktif as any, daftar.map(d => satu(d.id, 'SAH')))
    expect(h).toMatchObject({ lengkap: true, jumlahWajib: 5 })
  })

  it('tidak lengkap bila dokumen aktif belum ada barisnya sama sekali', () => {
    const h = hitungStatusGuru(daftar as any, [satu('d1','SAH')])
    expect(h).toMatchObject({ lengkap: false, jumlahSah: 1, jumlahWajib: 5 })
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/status.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `hitungStatusGuru`**

Hanya dokumen dengan `aktif === true` yang dihitung. Dokumen aktif yang belum punya baris `DokumenGuru` dihitung sebagai belum diunggah (bukan diabaikan) — inilah yang membuat guru lama kembali tidak lengkap saat admin menambah dokumen baru. Urutan prioritas label: ada ditolak → lengkap → perlu dicek → belum mulai.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/status.test.ts` → PASS, 6 test lulus

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: perhitungan status guru sebagai fungsi murni"
```

---

### Task 5: Riwayat

Setiap keputusan dan unggahan meninggalkan jejak. Riwayat bersifat tambah-saja: tidak ada yang mengubah atau menghapus barisnya.

**Files:**
- Create: `src/lib/riwayat.ts`
- Test: `tests/lib/riwayat.test.ts`

**Interfaces:**
- Consumes: `prisma` dari Task 1
- Produces:
  - `catatRiwayat(masukan: { periodeId: string; guruId?: string; dokumenId?: string; aksi: AksiRiwayat; alasan?: string; oleh: string; olehTipe: 'guru' | 'admin' }): Promise<void>`
  - `type AksiRiwayat = 'unggah' | 'ganti_file' | 'sahkan' | 'tolak' | 'batalkan' | 'buka_periode' | 'tutup_periode' | 'ubah_daftar_dokumen' | 'impor_guru' | 'buat_admin'`
  - `daftarRiwayatDokumen(guruId: string, dokumenId: string): Promise<Riwayat[]>`
  - `daftarRiwayatPeriode(periodeId: string, opsi?: { batas?: number; halaman?: number }): Promise<Riwayat[]>`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/lib/riwayat.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { catatRiwayat, daftarRiwayatDokumen } from '../../src/lib/riwayat'

describe('riwayat', () => {
  beforeEach(async () => { await prisma.riwayat.deleteMany() })

  it('mencatat alasan penolakan', async () => {
    await catatRiwayat({ periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', aksi: 'tolak', alasan: 'Scan buram', oleh: 'a1', olehTipe: 'admin' })
    const r = await daftarRiwayatDokumen('g1', 'd1')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ aksi: 'tolak', alasan: 'Scan buram', olehTipe: 'admin' })
  })

  it('mengembalikan riwayat terbaru lebih dulu', async () => {
    await catatRiwayat({ periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', aksi: 'unggah', oleh: 'g1', olehTipe: 'guru' })
    await catatRiwayat({ periodeId: 'p1', guruId: 'g1', dokumenId: 'd1', aksi: 'sahkan', oleh: 'a1', olehTipe: 'admin' })
    const r = await daftarRiwayatDokumen('g1', 'd1')
    expect(r.map(x => x.aksi)).toEqual(['sahkan', 'unggah'])
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/riwayat.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `catatRiwayat` dan pembacanya**

Urutkan `waktu` menurun. `daftarRiwayatPeriode` memakai `take: batas ?? 50` dan `skip` dari `halaman ?? 0`.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/riwayat.test.ts` → PASS, 2 test lulus

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pencatatan riwayat tambah-saja"
```

---

### Task 6: Klien Google Drive

Mengurus autentikasi OAuth2 dan operasi Drive. Ini satu-satunya berkas yang boleh menyentuh `googleapis`; seluruh aplikasi bicara lewat antarmuka tipis di bawah ini, sehingga Drive bisa diganti tanpa menyentuh alur unggah.

**Files:**
- Create: `src/lib/drive.ts`
- Create: `src/lib/namaAman.ts`
- Test: `tests/lib/namaAman.test.ts`, `tests/unit/drive.test.ts`

**Interfaces:**
- Consumes: tidak ada
- Produces:
  - `amanUntukNamaFolder(nama: string): string` — membersihkan karakter terlarang dan memotong panjang
  - `folderGuru(nip: string, nama: string): Promise<string>` — mengembalikan folder id, membuat bila belum ada
  - `unggahKeDrive(masukan: { folderId: string; namaFile: string; tipe: string; isi: Buffer }): Promise<{ fileId: string }>`
  - `hapusDariDrive(fileId: string): Promise<void>` — tidak melempar bila file sudah tidak ada
  - `unduhInfoFile(fileId: string): Promise<{ nama: string; tipe: string; ukuran: number } | null>`

- [ ] **Step 1: Tulis test `namaAman` yang gagal**

Ini menutup Review Focus nomor 2. Test ini harus lulus tanpa jaringan.

```ts
// tests/lib/namaAman.test.ts
import { describe, it, expect } from 'vitest'
import { amanUntukNamaFolder } from '../../src/lib/namaAman'

describe('amanUntukNamaFolder', () => {
  it('membiarkan nama biasa apa adanya', () => {
    expect(amanUntukNamaFolder('Siti Rahmawati')).toBe('Siti Rahmawati')
  })

  it('mengganti garis miring yang akan memecah folder', () => {
    expect(amanUntukNamaFolder('Dewi / Lestari')).toBe('Dewi - Lestari')
  })

  it('mengganti seluruh karakter terlarang Drive', () => {
    const hasil = amanUntukNamaFolder('a\\b:c*d?e"f<g>h|i')
    expect(hasil).not.toMatch(/[\\/:*?"<>|]/)
  })

  it('memotong nama yang sangat panjang', () => {
    expect(amanUntukNamaFolder('x'.repeat(500)).length).toBeLessThanOrEqual(100)
  })

  it('tidak mengembalikan nama kosong untuk masukan aneh', () => {
    expect(amanUntukNamaFolder('   ').length).toBeGreaterThan(0)
    expect(amanUntukNamaFolder('///').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/namaAman.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `amanUntukNamaFolder`**

Ganti `\ / : * ? " < > |` dengan ` - `, rapikan spasi ganda, potong ke 100 karakter, dan kembalikan `"Tanpa Nama"` bila hasilnya kosong. Jangan buang huruf beraksen atau karakter non-Latin — nama Indonesia bisa memuatnya.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/namaAman.test.ts` → PASS, 5 test lulus

- [ ] **Step 5: Implementasikan klien Drive**

`src/lib/drive.ts` membuat `OAuth2Client` dari `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, lalu `google.drive({ version: 'v3', auth })`.

`folderGuru` mencari folder bernama `amanUntukNamaFolder(`${nip} - ${nama}`)` di `DRIVE_FOLDER_ID`. **Bila ada dua folder dengan nama sama, pakai yang pertama diurutkan `createdTime` menaik** — tanpa ini, folder duplikat bisa muncul setiap kali ada permintaan bersamaan, dan dokumen guru terbelah di dua folder.

`unggahKeDrive` memakai `files.create` dengan `media: { mimeType: tipe, body: Readable.from(isi) }` dan `fields: 'id'`.

- [ ] **Step 6: Tulis test unit Drive dengan tiruan**

```ts
// tests/unit/drive.test.ts
import { describe, it, expect, vi } from 'vitest'

// tirukan modul googleapis supaya tidak ada jaringan
vi.mock('googleapis', () => {
  const create = vi.fn().mockResolvedValue({ data: { id: 'file-abc' } })
  return {
    google: {
      drive: () => ({ files: { create, list: vi.fn().mockResolvedValue({ data: { files: [] } }) } }),
      auth: { OAuth2: class { setCredentials() {} } },
    },
    __create: create,
  }
})

describe('unggahKeDrive', () => {
  it('mengembalikan fileId dari Drive', async () => {
    const { unggahKeDrive } = await import('../../src/lib/drive')
    const hasil = await unggahKeDrive({ folderId: 'f1', namaFile: 'ijazah.pdf', tipe: 'application/pdf', isi: Buffer.from('x') })
    expect(hasil.fileId).toBe('file-abc')
  })

  it('meneruskan alasan galat Drive apa adanya', async () => {
    const mod: any = await import('googleapis')
    mod.__create.mockRejectedValueOnce(new Error('invalid_grant'))
    const { unggahKeDrive } = await import('../../src/lib/drive')
    await expect(unggahKeDrive({ folderId: 'f1', namaFile: 'a.pdf', tipe: 'application/pdf', isi: Buffer.from('x') }))
      .rejects.toThrow('invalid_grant')
  })
})
```

- [ ] **Step 7: Jalankan, pastikan lulus** — `npx vitest run tests/unit/drive.test.ts` → PASS, 2 test lulus

- [ ] **Step 8: Tulis skrip sekali-jalan untuk mendapatkan refresh token**

`scripts/oauth.mjs`: mencetak URL persetujuan, menerima kode dari baris perintah, menukarnya dengan token, lalu mencetak `GOOGLE_REFRESH_TOKEN` untuk disalin ke `.env`. Skrip ini dijalankan sekali oleh admin, tidak pernah dari dalam aplikasi.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: klien google drive dan pembersih nama folder"
```

---

### Task 7: Pemeriksaan berkas unggahan

Memutuskan apakah sebuah unggahan layak diteruskan ke Drive. Dipisah dari route handler supaya bisa diuji tanpa HTTP.

**Files:**
- Create: `src/lib/periksaBerkas.ts`
- Test: `tests/lib/periksaBerkas.test.ts`

**Interfaces:**
- Consumes: tidak ada
- Produces:
  - `periksaBerkas(masukan: { nama: string; tipe: string; isi: Buffer }): { sah: true } | { sah: false; pesan: string }`
  - `const BATAS_UKURAN = 5 * 1024 * 1024`

- [ ] **Step 1: Tulis test yang gagal**

Test "menolak file yang hanya diganti namanya" menutup Review Focus nomor 1. Magic bytes: PDF diawali `%PDF-` (`25 50 44 46 2D`), JPG diawali `FF D8 FF`.

```ts
// tests/lib/periksaBerkas.test.ts
import { describe, it, expect } from 'vitest'
import { periksaBerkas, BATAS_UKURAN } from '../../src/lib/periksaBerkas'

const pdf = Buffer.from('%PDF-1.4\n...isi...')
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

describe('periksaBerkas', () => {
  it('menerima PDF yang benar', () => {
    expect(periksaBerkas({ nama: 'ijazah.pdf', tipe: 'application/pdf', isi: pdf })).toEqual({ sah: true })
  })

  it('menerima JPG yang benar', () => {
    expect(periksaBerkas({ nama: 'foto.jpg', tipe: 'image/jpeg', isi: jpg })).toEqual({ sah: true })
  })

  it('menolak file yang hanya diganti namanya', () => {
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00])
    const h = periksaBerkas({ nama: 'ijazah.pdf', tipe: 'application/pdf', isi: exe })
    expect(h.sah).toBe(false)
  })

  it('menolak file yang melebihi batas ukuran', () => {
    const besar = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(BATAS_UKURAN)])
    const h = periksaBerkas({ nama: 'besar.pdf', tipe: 'application/pdf', isi: besar })
    expect(h).toEqual({ sah: false, pesan: expect.stringContaining('5 MB') })
  })

  it('menolak berkas kosong', () => {
    expect(periksaBerkas({ nama: 'a.pdf', tipe: 'application/pdf', isi: Buffer.alloc(0) }).sah).toBe(false)
  })

  it('menolak tipe yang tidak diizinkan walau isinya PDF', () => {
    expect(periksaBerkas({ nama: 'a.docx', tipe: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', isi: pdf }).sah).toBe(false)
  })

  it('menolak JPG yang isinya ternyata PDF', () => {
    expect(periksaBerkas({ nama: 'a.jpg', tipe: 'image/jpeg', isi: pdf }).sah).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/periksaBerkas.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `periksaBerkas`**

Periksa berurutan: isi tidak kosong → ukuran ≤ `BATAS_UKURAN` → `tipe` termasuk `application/pdf` atau `image/jpeg` → magic bytes cocok dengan `tipe`. Magic bytes yang menang, bukan nama berkas. Pesan galat berbahasa Indonesia dan menyebut alasan konkret ("Ukuran berkas melebihi 5 MB", "Isi berkas bukan PDF atau JPG yang sah").

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/periksaBerkas.test.ts` → PASS, 7 test lulus

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pemeriksaan berkas berdasarkan isi, bukan nama"
```

---

### Task 8: Route unggah dokumen

Jantung sistem. Ini task paling berisiko, karena menyentuh Drive dan basis data sekaligus.

**Files:**
- Create: `src/app/api/dokumen/unggah/route.ts`
- Create: `src/lib/unggahDokumen.ts`
- Test: `tests/api/unggah.test.ts`

**Interfaces:**
- Consumes: `wajibGuru()` (Task 2), `prisma` (Task 1), `folderGuru` + `unggahKeDrive` + `hapusDariDrive` (Task 6), `periksaBerkas` (Task 7), `catatRiwayat` (Task 5)
- Produces:
  - `POST /api/dokumen/unggah` — `multipart/form-data`: `dokumenId`, `berkas`. Balasan `{ ok: true, status: 'MENUNGGU' }` atau `{ ok: false, pesan: string }`
  - `unggahDokumen(masukan: { guruId: string; periodeId: string; dokumenId: string; nama: string; tipe: string; isi: Buffer; oleh: string }): Promise<{ status: string }>` — dipakai juga oleh test

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/api/unggah.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '../../src/lib/db'
import { unggahDokumen } from '../../src/lib/unggahDokumen'

vi.mock('../../src/lib/drive', () => ({
  folderGuru: vi.fn().mockResolvedValue('folder-1'),
  unggahKeDrive: vi.fn().mockResolvedValue({ fileId: 'file-1' }),
  hapusDariDrive: vi.fn().mockResolvedValue(undefined),
}))

const pdf = Buffer.from('%PDF-1.4\nisi')

describe('unggahDokumen', () => {
  // beforeEach: siapkan satu admin, satu guru, satu periode terbuka, satu daftar dokumen,
  // lalu simpan id-nya di variabel modul: adminId, guruId, periodeId, dokumenId

  it('mencatat status MENUNGGU setelah unggahan berhasil', async () => {
    const h = await unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })
    expect(h.status).toBe('MENUNGGU')
    const baris = await prisma.dokumenGuru.findFirst({ where: { guruId, dokumenId } })
    expect(baris).toMatchObject({ status: 'MENUNGGU', fileId: 'file-1' })
  })

  it('menolak unggahan saat periode tertutup', async () => {
    await prisma.periode.update({ where: { id: periodeId }, data: { dibuka: false } })
    await expect(unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId }))
      .rejects.toThrow('Masa pengunggahan sedang ditutup')
  })

  it('menolak mengganti dokumen yang sudah sah', async () => {
    await prisma.dokumenGuru.updateMany({ where: { guruId, dokumenId }, data: { status: 'SAH' } })
    await expect(unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId }))
      .rejects.toThrow('Dokumen ini sudah dinyatakan sah')
  })

  it('mengizinkan mengganti dokumen yang masih menunggu', async () => {
    await unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })
    const h = await unggahDokumen({ guruId, periodeId, dokumenId, nama: 'b.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })
    expect(h.status).toBe('MENUNGGU')
  })

  it('tidak menyimpan baris apa pun bila Drive gagal', async () => {
    const drive: any = await import('../../src/lib/drive')
    drive.unggahKeDrive.mockRejectedValueOnce(new Error('invalid_grant'))
    await expect(unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: Buffer.from('%PDF-x'), oleh: guruId }))
      .rejects.toThrow('invalid_grant')
    const baris = await prisma.dokumenGuru.findFirst({ where: { guruId, dokumenId } })
    expect(baris?.fileId ?? null).toBeNull()
  })

  it('menghapus file lama dari Drive saat mengganti file yang menunggu', async () => {
    await unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })
    const drive: any = await import('../../src/lib/drive')
    await unggahDokumen({ guruId, periodeId, dokumenId, nama: 'b.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })
    expect(drive.hapusDariDrive).toHaveBeenCalledWith('file-1')
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/api/unggah.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `unggahDokumen`**

Urutan operasi **wajib** begini, dan urutannya bukan pilihan:

1. Periksa periode `dibuka === true`. Kalau tidak, lempar `Error('Masa pengunggahan sedang ditutup')`.
2. Baca baris `DokumenGuru` yang ada. Kalau `status === 'SAH'`, lempar `Error('Dokumen ini sudah dinyatakan sah')`.
3. Panggil `periksaBerkas`. Kalau tidak sah, lempar dengan pesannya.
4. Panggil `folderGuru(guru.nip, guru.nama)`, lalu `unggahKeDrive`.
5. **Baru sesudah Drive berhasil**, tulis baris basis data: `fileId`, `status: 'MENUNGGU'`, `diunggahPada`, dan kosongkan `alasan`, `diperiksaOleh`, `diperiksaPada`. Pakai `upsert` pada kunci unik `(periodeId, guruId, dokumenId)`.
6. Panggil `hapusDariDrive` untuk `fileId` lama, tetapi **hanya setelah** baris baru tersimpan, dan bungkus dalam `try/catch` yang menelan galat. Kalau gagal, yang tertinggal hanyalah file yatim di Drive — jauh lebih ringan daripada kehilangan baris dokumen.

Simpan `fileId` lama di variabel sebelum langkah 5, karena langkah itu menimpanya.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/api/unggah.test.ts` → PASS, 6 test lulus

- [ ] **Step 5: Implementasikan route handler**

`src/app/api/dokumen/unggah/route.ts` memanggil `wajibGuru()`, membaca `formData()`, memastikan `dokumenId` milik periode yang sedang dibuka **dan** guru yang sedang masuk (jangan percaya `guruId` dari klien), lalu memanggil `unggahDokumen`. Tangkap `Error` dan balas `{ ok: false, pesan: error.message }` dengan status 400.

- [ ] **Step 6: Konfigurasi batas ukuran badan permintaan**

Tambahkan ke handler: `export const runtime = 'nodejs'` dan `export const maxDuration = 60`. Di nginx (Task 16) tambahkan `client_max_body_size 8M;`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: route unggah dokumen dengan urutan drive-lalu-basisdata"
```

---

### Task 9: Halaman guru

Halaman yang dipakai 300 orang. Yang paling penting bukan keindahannya, tetapi bahwa guru bisa melihat status tanpa bertanya.

**Files:**
- Create: `src/app/masuk/page.tsx`
- Create: `src/app/dokumen/page.tsx`
- Create: `src/components/TombolUnggah.tsx`, `src/components/KartuDokumen.tsx`
- Create: `src/app/api/ganti-sandi/route.ts`
- Test: `tests/e2e/guru.spec.ts` (Playwright)

**Interfaces:**
- Consumes: `wajibGuru()` (Task 2), `hitungStatusGuru` (Task 4), `daftarRiwayatDokumen` (Task 5), `POST /api/dokumen/unggah` (Task 8)
- Produces: rute `/masuk`, `/dokumen`, `/ganti-sandi`

- [ ] **Step 1: Implementasikan halaman masuk**

Formulir email + sandi, memanggil `POST /api/auth/masuk`. Tampilkan pesan galat berbahasa Indonesia: "Email atau kata sandi salah" dan "Terlalu banyak percobaan. Coba lagi dalam 15 menit." setelah status 429.

- [ ] **Step 2: Implementasikan halaman Dokumen Saya**

Halaman server component: ambil periode yang sedang dibuka, daftar dokumen aktifnya, dan baris `DokumenGuru` milik guru itu. Tampilkan satu kartu per dokumen dengan salah satu dari empat keadaan:

- **Belum diunggah** — tombol "Unggah"
- **Menunggu diperiksa** — label abu, tombol "Ganti file" (guru boleh mengganti selama belum sah)
- **Sah** — label hijau, tanpa tombol
- **Ditolak** — label merah, kotak alasan dari admin, tombol "Unggah ulang"

Tampilkan ringkasan di atas daftar: `Progres: 3 dari 5 dokumen sah`, memakai `hitungStatusGuru`.

Di bawah tiap kartu yang pernah ditolak atau diganti, tampilkan riwayat dokumen itu dari `daftarRiwayatDokumen(guruId, dokumenId)` — terbaru lebih dulu, berisi aksi, waktu, dan alasan. Ini yang menjawab pertanyaan "kok ditolak lagi?" tanpa guru perlu menghubungi admin.

- [ ] **Step 3: Implementasikan `TombolUnggah`**

Komponen klien: `<input type="file" accept="application/pdf,image/jpeg">`. Sebelum mengirim, periksa `berkas.size <= 5 * 1024 * 1024` di peramban dan tolak lebih awal dengan pesan yang sama seperti server. Kirim lewat `FormData` ke `/api/dokumen/unggah`. Setelah berhasil, `router.refresh()`.

Bila server membalas `ok: false`, tampilkan `pesan` di bawah tombol — jangan pernah mengganti kartu menjadi "Menunggu diperiksa" sebelum server memastikan berhasil (Review Focus nomor 5).

Beri juga umpan balik selama unggahan berlangsung ("Sedang mengunggah…", tombol dinonaktifkan) dan tangani koneksi putus: bila `fetch` gagal karena jaringan, tampilkan "Koneksi terputus. Periksa jaringan Anda lalu coba lagi." dengan tombol coba lagi yang mengirim ulang berkas yang sama, tanpa guru perlu memilih filenya lagi. Di HP dengan sinyal lemah, ini perbedaan antara guru berhasil dan guru menyerah.

- [ ] **Step 4: Implementasikan halaman ganti sandi**

Formulir sandi lama, sandi baru, konfirmasi. Minimal 8 karakter. Setelah berhasil, hapus semua sesi lain milik guru itu.

- [ ] **Step 5: Tulis test Playwright**

```ts
// tests/e2e/guru.spec.ts
import { test, expect } from '@playwright/test'

test('guru melihat alasan penolakan dan bisa mengunggah ulang', async ({ page }) => {
  await page.goto('/masuk')
  await page.fill('[name=email]', 'guru@contoh.id')
  await page.fill('[name=sandi]', 'sandi-awal-123')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Scan kurang jelas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unggah ulang' })).toBeVisible()
})

test('dokumen yang sudah sah tidak bisa diganti', async ({ page }) => {
  // masuk sebagai guru yang memiliki satu dokumen SAH
  await expect(page.getByText('SAH')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ganti file' })).toHaveCount(0)
})
```

- [ ] **Step 6: Jalankan test** — `npx playwright test tests/e2e/guru.spec.ts` → PASS, 2 test lulus

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: halaman guru dengan status dan alasan penolakan"
```

---

### Task 10: Keputusan admin — sahkan, tolak, batalkan

Ini tempat alasan penolakan ditegakkan. Aturan "tidak boleh kosong" harus hidup di sini, bukan hanya di formulir.

**Files:**
- Create: `src/lib/keputusan.ts`
- Create: `src/app/api/admin/keputusan/route.ts`
- Create: `src/app/admin/guru/[id]/page.tsx`
- Test: `tests/lib/keputusan.test.ts`

**Interfaces:**
- Consumes: `wajibAdmin()` (Task 2), `catatRiwayat` (Task 5), `hitungStatusGuru` (Task 4)
- Produces:
  - `sahkanDokumen(masukan: { dokumenGuruId: string; adminId: string }): Promise<void>`
  - `tolakDokumen(masukan: { dokumenGuruId: string; adminId: string; alasan: string }): Promise<void>`
  - `batalkanKeputusan(masukan: { dokumenGuruId: string; adminId: string; alasan: string; statusBaru: 'SAH' | 'DITOLAK' }): Promise<void>`
  - `POST /api/admin/keputusan` — `{ dokumenGuruId, aksi: 'sahkan' | 'tolak' | 'batalkan', alasan?, statusBaru? }`

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/lib/keputusan.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { sahkanDokumen, tolakDokumen, batalkanKeputusan } from '../../src/lib/keputusan'

describe('keputusan admin', () => {
  // beforeEach: siapkan adminId, satu DokumenGuru berstatus MENUNGGU (dokumenGuruId),
  // dan bersihkan tabel Riwayat

  it('menyahkan mencatat admin dan waktu', async () => {
    await sahkanDokumen({ dokumenGuruId, adminId })
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d).toMatchObject({ status: 'SAH', diperiksaOleh: adminId })
    expect(d!.diperiksaPada).not.toBeNull()
  })

  it('menolak tanpa alasan ditolak sistem', async () => {
    await expect(tolakDokumen({ dokumenGuruId, adminId, alasan: '   ' }))
      .rejects.toThrow('Alasan penolakan wajib diisi')
  })

  it('menolak tanpa objek alasan sama sekali', async () => {
    await expect(tolakDokumen({ dokumenGuruId, adminId } as any))
      .rejects.toThrow('Alasan penolakan wajib diisi')
  })

  it('menolak dengan alasan menyimpan alasannya', async () => {
    await tolakDokumen({ dokumenGuruId, adminId, alasan: 'Stempel terpotong' })
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d).toMatchObject({ status: 'DITOLAK', alasan: 'Stempel terpotong' })
  })

  it('membatalkan keputusan wajib beralasan', async () => {
    await expect(batalkanKeputusan({ dokumenGuruId, adminId, alasan: '', statusBaru: 'DITOLAK' }))
      .rejects.toThrow('Alasan pembatalan wajib diisi')
  })

  it('membatalkan keputusan mengubah status dan mencatatnya', async () => {
    await sahkanDokumen({ dokumenGuruId, adminId })
    await batalkanKeputusan({ dokumenGuruId, adminId, alasan: 'Salah orang', statusBaru: 'DITOLAK' })
    const d = await prisma.dokumenGuru.findUnique({ where: { id: dokumenGuruId } })
    expect(d!.status).toBe('DITOLAK')
    const r = await prisma.riwayat.findMany({ where: { dokumenId: d!.dokumenId } })
    expect(r.map(x => x.aksi)).toContain('batalkan')
  })

  it('menolak keputusan atas dokumen yang tidak ada', async () => {
    await expect(sahkanDokumen({ dokumenGuruId: 'tidak-ada', adminId }))
      .rejects.toThrow('Dokumen tidak ditemukan')
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/keputusan.test.ts` → FAIL

- [ ] **Step 3: Implementasikan ketiga fungsi**

`alasan.trim() === ''` → lempar. Periksa panjang maksimum alasan 1000 karakter. Setiap fungsi menulis baris `DokumenGuru` **dan** `catatRiwayat` di dalam satu `prisma.$transaction`, supaya tidak mungkin ada keputusan tanpa jejak.

Ketiganya membaca ulang baris di dalam transaksi sebelum menulis (Review Focus nomor 3). Dua admin yang menekan tombol bersamaan akan sama-sama berhasil, keputusan terakhir menang, dan **keduanya** meninggalkan baris riwayat.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/keputusan.test.ts` → PASS, 7 test lulus

- [ ] **Step 5: Implementasikan route dan halaman Detail Guru**

Route memvalidasi dengan `zod` (`alasan` wajib untuk `tolak` dan `batalkan`) lalu memanggil fungsinya. Halaman server component menampilkan identitas guru, progres, dan per dokumen: nama, pratinjau (tautan "Buka file" ke Drive), status, alasan terakhir, tombol **Sahkan** / **Tolak**, dan tombol **Batalkan keputusan** dengan pemilih status baru. Riwayat dokumen ditampilkan di bawah, terbaru lebih dulu.

- [ ] **Step 6: Tulis test bahwa dua keputusan bersamaan sama-sama tercatat**

```ts
it('dua keputusan bersamaan sama-sama meninggalkan riwayat', async () => {
  await Promise.all([
    sahkanDokumen({ dokumenGuruId, adminId }),
    tolakDokumen({ dokumenGuruId, adminId, alasan: 'Kurang jelas' }),
  ])
  const r = await prisma.riwayat.findMany({ where: { dokumenId } })
  expect(r).toHaveLength(2)
})
```

- [ ] **Step 7: Jalankan test** — `npx vitest run tests/lib/keputusan.test.ts` → PASS, 8 test lulus

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: keputusan admin dengan alasan wajib dan pembatalan tercatat"
```

---

### Task 11: Daftar dokumen per periode

Admin menyusun sendiri dokumen apa yang diminta. Menambah dokumen di tengah jalan punya akibat berantai ke status guru, jadi peringatannya wajib.

**Files:**
- Create: `src/app/admin/periode/[id]/dokumen/page.tsx`
- Create: `src/app/api/admin/dokumen/route.ts`
- Create: `src/lib/kelolaDokumen.ts`
- Test: `tests/lib/kelolaDokumen.test.ts`

**Interfaces:**
- Consumes: `wajibAdmin()` (Task 2), `hitungStatusGuru` (Task 4), `catatRiwayat` (Task 5)
- Produces:
  - `tambahDokumen(masukan: { periodeId: string; nama: string; urutan: number; adminId: string }): Promise<{ akanTidakLengkap: number }>`
  - `ubahDokumen(masukan: { dokumenId: string; nama?: string; urutan?: number; adminId: string }): Promise<void>`
  - `nonaktifkanDokumen(masukan: { dokumenId: string; adminId: string }): Promise<void>`
  - `hitungDampakDokumenBaru(periodeId: string): Promise<number>` — berapa guru yang tadinya lengkap akan kembali tidak lengkap

- [ ] **Step 1: Tulis test yang gagal**

```ts
// tests/lib/kelolaDokumen.test.ts
import { describe, it, expect } from 'vitest'
import { prisma } from '../../src/lib/db'
import { tambahDokumen, nonaktifkanDokumen, hitungDampakDokumenBaru } from '../../src/lib/kelolaDokumen'

describe('kelola dokumen', () => {
  // beforeEach: satu periode dengan 2 dokumen aktif, satu guru dengan keduanya SAH
  // (guru itu lengkap), dan satu admin

  it('menghitung guru yang akan kembali tidak lengkap', async () => {
    expect(await hitungDampakDokumenBaru(periodeId)).toBe(1)
  })

  it('menambah dokumen membuat guru lengkap kembali tidak lengkap', async () => {
    const h = await tambahDokumen({ periodeId, nama: 'Kartu Pegawai', urutan: 3, adminId })
    expect(h.akanTidakLengkap).toBe(1)
    const d = await prisma.dokumenGuru.findFirst({ where: { guruId, periodeId, dokumen: { nama: 'Kartu Pegawai' } } })
    expect(d).toBeNull()
  })

  it('menonaktifkan dokumen tidak menghapus barisnya', async () => {
    const dok = await prisma.daftarDokumen.findFirst({ where: { periodeId, nama: 'Dok A' } })
    await nonaktifkanDokumen({ dokumenId: dok!.id, adminId })
    const sesudah = await prisma.daftarDokumen.findUnique({ where: { id: dok!.id } })
    expect(sesudah).toMatchObject({ aktif: false })
    const jumlah = await prisma.dokumenGuru.count({ where: { dokumenId: dok!.id } })
    expect(jumlah).toBeGreaterThan(0)
  })

  it('mengaktifkan kembali dokumen mengembalikan pengaruhnya pada status', async () => {
    const dok = await prisma.daftarDokumen.findFirst({ where: { periodeId, nama: 'Dok A' } })
    await nonaktifkanDokumen({ dokumenId: dok!.id, adminId })
    await prisma.daftarDokumen.update({ where: { id: dok!.id }, data: { aktif: true } })
    expect(await hitungDampakDokumenBaru(periodeId)).toBe(0)
  })

  it('menolak nama dokumen kosong', async () => {
    await expect(tambahDokumen({ periodeId, nama: '  ', urutan: 3, adminId }))
      .rejects.toThrow('Nama dokumen wajib diisi')
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/kelolaDokumen.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `kelolaDokumen`**

`hitungDampakDokumenBaru` menghitung guru yang saat ini `lengkap === true` memakai `hitungStatusGuru` atas dokumen aktif yang ada **sekarang**. `tambahDokumen` membuat baris `DaftarDokumen` baru dan mengembalikan angka itu sebagai peringatan. Ia **tidak** membuat baris `DokumenGuru` untuk tiap guru — baris yang tidak ada sudah dihitung "belum diunggah" oleh Task 4, dan membuat 300 baris kosong setiap kali admin menambah dokumen adalah pemborosan yang tidak perlu.

`nonaktifkanDokumen` hanya menyetel `aktif = false`. Tidak pernah `delete`.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/kelolaDokumen.test.ts` → PASS, 5 test lulus

- [ ] **Step 5: Implementasikan halaman dan route**

Halaman menampilkan daftar dokumen dengan urutan yang bisa diubah. Sebelum menambah dokumen, panggil `hitungDampakDokumenBaru` dan tampilkan konfirmasi: "Menambah dokumen ini akan membuat **N guru** yang sudah lengkap kembali berstatus belum lengkap. Lanjutkan?" (Review Focus nomor 4). Tombol nonaktifkan memberi tahu bahwa dokumen tidak dihapus, hanya disembunyikan.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: kelola daftar dokumen per periode dengan peringatan dampak"
```

---

### Task 12: Periode dan daftar guru

Periode adalah wadah kegiatan; daftar guru adalah cara 300 akun dibuat.

**Files:**
- Create: `src/lib/periode.ts`, `src/lib/imporGuru.ts`, `src/lib/salinDokumen.ts`
- Create: `src/app/admin/periode/page.tsx`, `src/app/admin/guru/page.tsx`
- Create: `src/app/api/admin/periode/route.ts`, `src/app/api/admin/guru/impor/route.ts`
- Test: `tests/lib/periode.test.ts`, `tests/lib/imporGuru.test.ts`

**Interfaces:**
- Consumes: `wajibAdmin()` (Task 2), `catatRiwayat` (Task 5), `hashSandi` (Task 2)
- Produces:
  - `buatPeriode(masukan: { nama: string; adminId: string }): Promise<{ id: string }>`
  - `bukaPeriode(masukan: { periodeId: string; adminId: string }): Promise<void>` / `tutupPeriode(...)`
  - `salinDaftarDokumen(masukan: { dariPeriodeId: string; kePeriodeId: string; adminId: string }): Promise<{ jumlah: number }>`
  - `imporGuru(masukan: { baris: { nama: string; nip: string; email: string }[]; adminId: string }): Promise<{ dibuat: number; dilewati: number; sandiAwal: { nama: string; email: string; sandi: string }[] }>`
  - `acakSandiAwal(): string`

- [ ] **Step 1: Tulis test impor yang gagal**

```ts
// tests/lib/imporGuru.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { imporGuru } from '../../src/lib/imporGuru'

describe('imporGuru', () => {
  beforeEach(async () => { await prisma.guru.deleteMany() })

  it('membuat akun untuk guru baru', async () => {
    const h = await imporGuru({ baris: [{ nama: 'Siti', nip: '1', email: 'siti@contoh.id' }], adminId: 'a1' })
    expect(h.dibuat).toBe(1)
    expect(h.sandiAwal[0]).toMatchObject({ email: 'siti@contoh.id' })
    expect(h.sandiAwal[0].sandi.length).toBeGreaterThanOrEqual(8)
  })

  it('melewati guru yang sudah ada tanpa menghapus datanya', async () => {
    await imporGuru({ baris: [{ nama: 'Siti', nip: '1', email: 'siti@contoh.id' }], adminId: 'a1' })
    const h = await imporGuru({ baris: [{ nama: 'Siti Baru', nip: '1', email: 'siti@contoh.id' }], adminId: 'a1' })
    expect(h).toMatchObject({ dibuat: 0, dilewati: 1 })
    const g = await prisma.guru.findUnique({ where: { nip: '1' } })
    expect(g!.nama).toBe('Siti')
  })

  it('memberi sandi awal yang berbeda untuk tiap guru', async () => {
    const h = await imporGuru({ baris: [
      { nama: 'A', nip: '1', email: 'a@contoh.id' },
      { nama: 'B', nip: '2', email: 'b@contoh.id' },
    ], adminId: 'a1' })
    expect(h.sandiAwal[0].sandi).not.toBe(h.sandiAwal[1].sandi)
  })

  it('tidak menyimpan sandi awal apa adanya', async () => {
    const h = await imporGuru({ baris: [{ nama: 'A', nip: '1', email: 'a@contoh.id' }], adminId: 'a1' })
    const g = await prisma.guru.findUnique({ where: { nip: '1' } })
    expect(g!.hashSandi).not.toContain(h.sandiAwal[0].sandi)
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/imporGuru.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `imporGuru` dan `acakSandiAwal`**

`sandiAwal` dikembalikan **sekali saja** dalam balasan HTTP untuk admin salin dan bagikan; sandi mentah tidak pernah disimpan. Kata yang mudah dibaca (hindari `0/O`, `1/l/I`). Guru yang `nip` atau `email`-nya sudah ada dilewati (tidak diperbarui) supaya impor ulang tidak menimpa data.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/imporGuru.test.ts` → PASS, 4 test lulus

- [ ] **Step 5: Tulis test periode dan salin dokumen**

```ts
// tests/lib/periode.test.ts
it('menutup periode tidak menghapus dokumen periode itu', async () => {
  const sebelum = await prisma.dokumenGuru.count({ where: { periodeId } })
  await tutupPeriode({ periodeId, adminId })
  expect(await prisma.dokumenGuru.count({ where: { periodeId } })).toBe(sebelum)
})

it('menyalin daftar dokumen dari periode lama', async () => {
  const h = await salinDaftarDokumen({ dariPeriodeId: lama, kePeriodeId: baru, adminId })
  expect(h.jumlah).toBeGreaterThan(0)
  const dok = await prisma.daftarDokumen.findMany({ where: { periodeId: baru } })
  expect(dok.map(d => d.nama)).toContain('Ijazah S1')
})

it('guru terverifikasi di periode lama tampil belum mengunggah di periode baru', async () => {
  // guru dengan semua dokumen SAH di periode lama, lalu periode baru tanpa dokumenGuru
  expect(await prisma.dokumenGuru.count({ where: { periodeId: baru, guruId } })).toBe(0)
})
```

- [ ] **Step 6: Implementasikan halaman dan route periode dan guru**

Halaman periode: daftar periode dengan status buka/tutup, tombol buat periode, buka, tutup, dan "Salin dokumen dari periode lain". Halaman guru: tabel 300 baris dengan pencarian dan penyaring status, tombol "Impor guru", dan panel hasil impor yang menampilkan sandi awal per guru **dengan tombol salin** dan peringatan bahwa sandi ini tidak akan bisa dilihat lagi setelah halaman ditutup.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: periode, impor guru, dan salin daftar dokumen antar periode"
```

---

### Task 13: Daftar guru, rekap, dan kelola admin

Tiga hal yang membuat pekerjaan admin bisa diselesaikan dan dilaporkan.

**Files:**
- Create: `src/app/admin/guru/page.tsx` (atau perluas dari Task 12)
- Create: `src/app/api/admin/rekap/route.ts`
- Create: `src/lib/rekap.ts`, `src/lib/kelolaAdmin.ts`
- Test: `tests/lib/rekap.test.ts`

**Interfaces:**
- Consumes: `hitungStatusGuru` (Task 4), `wajibAdmin()` (Task 2)
- Produces:
  - `type BarisRekap = { nip: string; nama: string; jumlahSah: number; jumlahWajib: number; status: string; tanggalVerifikasi: string | null }`
  - `susunRekap(periodeId: string): Promise<BarisRekap[]>`
  - `buatCsv(baris: BarisRekap[]): string`
  - `tambahAdmin(masukan: { nama: string; email: string; sandi: string; olehAdminId: string }): Promise<{ id: string }>`
  - `nonaktifkanAdmin(masukan: { adminId: string; olehAdminId: string }): Promise<void>`
  - `GET /api/admin/rekap?periodeId=...&format=csv|xlsx`

- [ ] **Step 1: Tulis test rekap yang gagal**

```ts
// tests/lib/rekap.test.ts
import { describe, it, expect } from 'vitest'
import { susunRekap, buatCsv } from '../../src/lib/rekap'

describe('rekap', () => {
  it('menyertakan seluruh guru, termasuk yang belum mengunggah', async () => {
    const r = await susunRekap(periodeId)
    expect(r).toHaveLength(300)
  })

  it('mengisi tanggalVerifikasi hanya untuk guru yang lengkap', async () => {
    const r = await susunRekap(periodeId)
    const lengkap = r.filter(x => x.status === 'Lengkap')
    const belum = r.filter(x => x.status !== 'Lengkap')
    expect(lengkap.every(x => x.tanggalVerifikasi !== null)).toBe(true)
    expect(belum.every(x => x.tanggalVerifikasi === null)).toBe(true)
  })

  it('membuat CSV dengan pemisah titik-koma agar aman dibuka Excel Indonesia', () => {
    const csv = buatCsv([{ nip: '1', nama: 'Siti', jumlahSah: 5, jumlahWajib: 5, status: 'Lengkap', tanggalVerifikasi: '2026-11-04' }])
    expect(csv.split('\n')[0]).toContain(';')
    expect(csv).toContain('Siti')
  })

  it('mengapit nama yang mengandung pemisah', () => {
    const csv = buatCsv([{ nip: '1', nama: 'Siti; S.Pd', jumlahSah: 0, jumlahWajib: 5, status: 'Belum mulai', tanggalVerifikasi: null }])
    expect(csv).toContain('"Siti; S.Pd"')
  })

  it('menetralkan nama yang dimulai dengan karakter rumus', () => {
    const csv = buatCsv([{ nip: '1', nama: '=SUM(A1:A9)', jumlahSah: 0, jumlahWajib: 5, status: 'Belum mulai', tanggalVerifikasi: null }])
    expect(csv).toContain("'=SUM(A1:A9)")
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/rekap.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `susunRekap` dan `buatCsv`**

`susunRekap` mengambil **seluruh** guru aktif, bukan hanya yang punya unggahan. `tanggalVerifikasi` diambil dari `diperiksaPada` terakhir di antara dokumen sah guru itu. `buatCsv` memakai pemisah `;` (lokalisasi Excel Indonesia), mengapit nilai yang memuat `;`, `"`, atau baris baru, dan **mengawali `'` pada nilai yang dimulai `=`, `+`, `-`, atau `@`** — tanpa itu, nama seperti `=SUM(...)` akan dieksekusi Excel saat rekap dibuka.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/rekap.test.ts` → PASS, 5 test lulus

- [ ] **Step 5: Implementasikan halaman dan route**

Halaman daftar guru: 300 baris dengan pencarian nama/NIP dan penyaring status, mengambil `hitungStatusGuru` per guru. Halaman rekap: tombol unduh CSV dan XLSX. Kelola admin: daftar admin, tambah admin, nonaktifkan admin — **admin terakhir tidak boleh dinonaktifkan**, kalau tidak sistem bisa terkunci tanpa siapa pun yang bisa masuk. Uji aturan itu dengan satu test tambahan di `tests/lib/rekap.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: daftar guru, rekap csv/xlsx, dan kelola admin"
```

---

### Task 14: Pengecilan gambar di peramban

Unggahan dari HP sering 3–8 MB untuk satu foto. Mengecilkannya sebelum dikirim menghemat kuota Drive, mempercepat unggahan guru, dan mengurangi waktu tunggu.

**Files:**
- Create: `src/lib/kecilkanGambar.ts`
- Modify: `src/components/TombolUnggah.tsx`
- Test: `tests/e2e/unggah-gambar.spec.ts` (Playwright)

**Interfaces:**
- Consumes: `TombolUnggah` dari Task 9
- Produces: `kecilkanGambar(berkas: File, opsi?: { sisiMaks?: number; mutu?: number }): Promise<File>`

- [ ] **Step 1: Implementasikan `kecilkanGambar`**

Hanya menyentuh berkas `image/jpeg`. Memakai `createImageBitmap` + `<canvas>`: sisi terpanjang maksimal 2000 px, ekspor `toBlob('image/jpeg', 0.85)`. **PDF dilewatkan tanpa diubah.** Bila hasilnya lebih besar dari aslinya, kembalikan berkas asli.

- [ ] **Step 2: Pasang di `TombolUnggah`**

Panggil sebelum pemeriksaan ukuran 5 MB, supaya foto besar yang sudah dikecilkan tidak ditolak percuma.

- [ ] **Step 3: Tulis test Playwright**

```ts
test('foto besar dikecilkan sebelum dikirim', async ({ page }) => {
  let ukuranDikirim = 0
  await page.route('**/api/dokumen/unggah', async route => {
    ukuranDikirim = (route.request().postDataBuffer() ?? Buffer.alloc(0)).length
    await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) })
  })
  // unggah berkas uji JPEG 4000x3000 sebesar ~6 MB dari tests/fixtures/foto-besar.jpg
  expect(ukuranDikirim).toBeLessThan(3 * 1024 * 1024)
})

test('PDF tidak diubah ukurannya', async ({ page }) => {
  // PDF 1 MB harus terkirim dengan ukuran yang praktis sama
})
```

- [ ] **Step 4: Jalankan test** — `npx playwright test tests/e2e/unggah-gambar.spec.ts` → PASS, 2 test lulus

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pengecilan gambar jpeg di peramban sebelum unggah"
```

---

### Task 15: Pemasangan, konfigurasi, dan cadangan

Sampai di sini aplikasi hanya jalan di komputer pengembang. Task ini membuatnya jalan di server Anda dan bisa diandalkan.

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `deploy/nginx.conf`, `scripts/cadangan.mjs`, `README.md`

**Interfaces:**
- Consumes: seluruh aplikasi
- Produces: perintah `docker compose up -d` yang menjalankan aplikasi di port 3000

- [ ] **Step 1: Tulis `.env.example`**

```
DATABASE_URL="file:./data/prod.db"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
DRIVE_FOLDER_ID=
SESSION_SECRET=
```

`.env.example` boleh masuk git; `.env` tidak. Pastikan `.gitignore` memuat `.env`, `*.db`, dan `data/`.

- [ ] **Step 2: Tulis `Dockerfile` dan `docker-compose.yml`**

Build multi-tahap: tahap builder menjalankan `npx prisma generate` dan `npm run build`, tahap akhir hanya memuat hasil build, `prisma` CLI, dan `node_modules` produksi. Volume `./data` dipasang ke `/app/data` supaya basis data SQLite bertahan saat kontainer diganti. `docker-compose.yml` menyetel `restart: unless-stopped`.

- [ ] **Step 3: Tulis `deploy/nginx.conf`**

Proxy ke `127.0.0.1:3000` dengan `client_max_body_size 8M;`, `proxy_read_timeout 120s;`, dan pengalihan HTTP ke HTTPS. Sertifikat lewat Certbot.

- [ ] **Step 4: Tulis skrip cadangan**

`scripts/cadangan.mjs` menyalin `data/prod.db` ke `data/cadangan/prod-YYYY-MM-DD.db` dan menyimpan 30 salinan terakhir. **Salinan dilakukan dengan `VACUUM INTO`** (SQLite), bukan `cp`, supaya tidak menyalin basis data saat sedang ditulis. Pasang di crontab harian.

- [ ] **Step 5: Uji pemulihan cadangan**

Ini langkah yang paling sering dilewati dan paling penting: pulihkan satu berkas cadangan ke direktori sementara, jalankan `npx prisma migrate status` dan satu kueri hitung terhadapnya, dan pastikan hasilnya masuk akal. Cadangan yang belum pernah diuji pulih bukan cadangan.

Run: `node scripts/cadangan.mjs && sqlite3 data/cadangan/prod-*.db "SELECT COUNT(*) FROM Guru;"`
Expected: angka yang cocok dengan basis data produksi

- [ ] **Step 6: Tulis `README.md`**

Memuat: cara mengisi `.env`, cara menjalankan `scripts/oauth.mjs` dan **memastikan aplikasi OAuth berstatus Published**, cara menaikkan versi baru, cara memulihkan cadangan, dan daftar periksa saat periode dibuka.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: docker, nginx, dan cadangan sqlite harian"
```

---

### Task 16: Uji ketahanan Drive dan penanganan galat

Task terakhir, dan yang paling menentukan apakah sistem bisa dipercaya saat gagal. Rancangan menyebut Review Focus nomor 5 secara khusus.

**Files:**
- Create: `src/lib/galatDrive.ts`
- Modify: `src/lib/drive.ts`, `src/components/TombolUnggah.tsx`, `src/app/admin/guru/[id]/page.tsx`
- Create: `src/app/api/kesehatan/route.ts`
- Test: `tests/lib/galatDrive.test.ts`

**Interfaces:**
- Consumes: `unggahKeDrive` (Task 6), `unggahDokumen` (Task 8)
- Produces:
  - `terjemahkanGalatDrive(e: unknown): { pesan: string; perluTindakan: boolean }`
  - `GET /api/kesehatan` — `{ drive: 'ok' | 'gagal'; pesan?: string }`

- [ ] **Step 1: Tulis test terjemahan galat yang gagal**

```ts
// tests/lib/galatDrive.test.ts
import { describe, it, expect } from 'vitest'
import { terjemahkanGalatDrive } from '../../src/lib/galatDrive'

describe('terjemahkanGalatDrive', () => {
  it('mengenali refresh token yang dicabut sebagai hal yang perlu tindakan', () => {
    const h = terjemahkanGalatDrive(new Error('invalid_grant'))
    expect(h.perluTindakan).toBe(true)
    expect(h.pesan).toContain('Drive')
  })

  it('mengenali kuota habis', () => {
    const h = terjemahkanGalatDrive({ code: 403, errors: [{ reason: 'storageQuotaExceeded' }] })
    expect(h.perluTindakan).toBe(true)
  })

  it('mengenali jaringan putus sebagai hal sementara', () => {
    const h = terjemahkanGalatDrive(new Error('ETIMEDOUT'))
    expect(h.perluTindakan).toBe(false)
    expect(h.pesan.toLowerCase()).toContain('coba lagi')
  })

  it('tidak membocorkan detail teknis ke guru', () => {
    const h = terjemahkanGalatDrive(new Error('invalid_grant'))
    expect(h.pesan).not.toContain('invalid_grant')
  })
})
```

- [ ] **Step 2: Jalankan, pastikan gagal** — `npx vitest run tests/lib/galatDrive.test.ts` → FAIL

- [ ] **Step 3: Implementasikan `terjemahkanGalatDrive`**

Petakan `invalid_grant` dan 401 → "Hubungan ke Google Drive terputus. Hubungi admin." (`perluTindakan: true`). `storageQuotaExceeded` dan 403 → "Penyimpanan Google Drive penuh. Hubungi admin." (`perluTindakan: true`). Galat jaringan (`ETIMEDOUT`, `ECONNRESET`, `ENOTFOUND`, 5xx) → "Koneksi sedang bermasalah. Silakan coba lagi." (`perluTindakan: false`). Sisanya → pesan umum.

Pesan yang dilihat guru **tidak boleh** memuat teks galat mentah — itu membocorkan nama berkas internal dan tidak berguna bagi guru.

- [ ] **Step 4: Jalankan, pastikan lulus** — `npx vitest run tests/lib/galatDrive.test.ts` → PASS, 4 test lulus

- [ ] **Step 5: Pasang di jalur unggah dan tampilkan di layar**

`unggahDokumen` memakai `terjemahkanGalatDrive` untuk mengubah galat Drive menjadi pesan Indonesia sebelum dilempar. `TombolUnggah` menampilkan pesan itu dan **tidak** menandai berhasil. Halaman Detail Guru menampilkan peringatan merah di atas daftar bila `/api/kesehatan` melaporkan Drive bermasalah.

- [ ] **Step 6: Implementasikan route kesehatan**

`GET /api/kesehatan` memanggil `drive.files.list({ pageSize: 1 })` dengan batas waktu 5 detik dan mengembalikan `ok` atau `gagal`. Berguna untuk memeriksa sebelum membuka periode.

- [ ] **Step 7: Tulis test uji coba ulang yang tidak menggandakan**

```ts
it('unggahan yang gagal di Drive tidak meninggalkan baris dokumen', async () => {
  const drive: any = await import('../../src/lib/drive')
  drive.unggahKeDrive.mockRejectedValueOnce(new Error('ETIMEDOUT'))
  await expect(unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })).rejects.toThrow()
  const baris = await prisma.dokumenGuru.findFirst({ where: { guruId, dokumenId } })
  expect(baris?.fileId ?? null).toBeNull()
})

it('unggahan ulang setelah gagal berhasil dan hanya menyimpan satu fileId', async () => {
  const h = await unggahDokumen({ guruId, periodeId, dokumenId, nama: 'a.pdf', tipe: 'application/pdf', isi: pdf, oleh: guruId })
  expect(h.status).toBe('MENUNGGU')
  expect(await prisma.dokumenGuru.count({ where: { guruId, dokumenId } })).toBe(1)
})
```

- [ ] **Step 8: Jalankan seluruh test** — `npx vitest run && npx playwright test` → semua lulus

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: penanganan galat drive dan pemeriksaan kesehatan"
```

---

## Catatan Pemasangan untuk Admin

Dua hal yang, kalau terlewat, membuat sistem gagal tanpa gejala yang jelas:

1. **Aplikasi OAuth harus berstatus Published, bukan Testing.** Status Testing membuat refresh token mati setelah 7 hari. Sistem akan tampak normal, lalu setiap unggahan mulai gagal.
2. **`DRIVE_FOLDER_ID` harus menunjuk folder milik akun Gmail pemilik refresh token.** Kalau tidak, Google akan menolak dengan galat izin yang sulit dibaca.

Sebelum membuka periode, periksa `GET /api/kesehatan` dan pastikan `drive: "ok"`.
