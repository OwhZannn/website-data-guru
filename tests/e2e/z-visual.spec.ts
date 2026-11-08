import { test, expect, type Page } from '@playwright/test'
import { db, masuk, SANDI } from './bantu'
import { hashSandi } from '../../src/lib/sandi'

// Uji visual: tampilan kunci dalam mode terang & gelap, di ponsel (375px) dan layar lebar (1440px).
// Berkas diawali "z-" supaya berjalan terakhir: ia mengosongkan basis data e2e dan mengisi data tetap.

const UKURAN = [
  { nama: 'ponsel', width: 375, height: 812 },
  { nama: 'lebar', width: 1440, height: 900 },
] as const
const SKEMA = ['light', 'dark'] as const

let guruId = ''
const ADMIN = 'visual-admin@contoh.id'
const GURU = '199001012020121001'

test.beforeAll(async () => {
  await db.riwayat.deleteMany()
  await db.dokumenGuru.deleteMany()
  await db.daftarDokumen.deleteMany()
  await db.periode.deleteMany()
  await db.sesi.deleteMany()
  await db.percobaanMasuk.deleteMany()
  await db.guru.deleteMany()
  await db.admin.deleteMany()

  const hash = await hashSandi(SANDI)
  await db.admin.create({ data: { nama: 'Admin Visual', email: ADMIN, hashSandi: hash } })
  const periode = await db.periode.create({ data: { nama: 'Semester Ganjil 2026', dibuka: true } })
  const nama = ['SK Pembagian Tugas', 'Ijazah Terakhir', 'Sertifikat Pendidik', 'Daftar Hadir']
  const dok = []
  for (const [i, n] of nama.entries()) {
    dok.push(await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: n, urutan: i } }))
  }
  const guru = await db.guru.create({
    data: {
      nama: 'Siti Rahmawati', username: GURU, nip: GURU, hashSandi: hash,
      asalSekolah: 'MAN 1 Contoh', statusPegawai: 'PNS', tahunSertifikasi: 2015,
    },
  })
  guruId = guru.id
  await db.guru.create({
    data: {
      nama: 'Ahmad Fauzi', username: '199202022021011002', nip: '199202022021011002', hashSandi: hash,
      asalSekolah: 'MTs Negeri 2 Contoh', statusPegawai: 'PNS', tahunSertifikasi: 2018,
    },
  })
  const status = ['SAH', 'MENUNGGU', 'DITOLAK'] as const
  for (const [i, s] of status.entries()) {
    await db.dokumenGuru.create({
      data: {
        periodeId: periode.id, guruId: guru.id, dokumenId: dok[i].id, status: s,
        alasan: s === 'DITOLAK' ? 'File tidak terbaca' : null,
        fileId: `palsu-${i}`, namaFile: `berkas-${i}.pdf`, tipe: 'application/pdf', ukuran: 10,
        diunggahPada: new Date('2026-11-01T02:00:00Z'),
      },
    })
  }
})

/** Elemen yang isinya bergantung waktu sekarang disamarkan. */
const samarkan = (page: Page) => [
  page.locator('.aktivitas__waktu'),
  page.locator('time'),
  page.locator('.riwayat'),
  page.locator('.timeline-riwayat'),
  page.locator('iframe'),
  page.locator('td[data-label="Aktivitas"]'),
  page.locator('td[data-label="Menunggu"]'),
  page.locator('.tabel-antrean td:last-child'),
]

async function foto(page: Page, berkas: string) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await expect(page).toHaveScreenshot(berkas, {
    fullPage: true, animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.02, mask: samarkan(page),
  })
}

for (const u of UKURAN) {
  for (const skema of SKEMA) {
    test.describe(`${u.nama} ${skema}`, () => {
      test.use({ viewport: { width: u.width, height: u.height }, colorScheme: skema })

      test('masuk', async ({ page }) => {
        await page.goto('/masuk')
        await foto(page, `masuk-${u.nama}-${skema}.png`)
      })

      test('admin: beranda, daftar guru, detail guru', async ({ page }) => {
        await masuk(page, ADMIN)
        await page.goto('/admin')
        await foto(page, `admin-beranda-${u.nama}-${skema}.png`)
        await page.goto('/admin/guru')
        await foto(page, `admin-guru-${u.nama}-${skema}.png`)
        await page.goto(`/admin/guru/${guruId}`)
        await foto(page, `admin-detail-${u.nama}-${skema}.png`)
      })

      test('guru: dokumen', async ({ page }) => {
        await masuk(page, GURU)
        await page.goto('/dokumen')
        await foto(page, `guru-dokumen-${u.nama}-${skema}.png`)
      })
    })
  }
}
