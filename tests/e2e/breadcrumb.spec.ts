import { test, expect, type Page } from '@playwright/test'
import { siapkan, masuk, buatAdmin, db } from './bantu'

// Breadcrumb: pemisah di antara butir saja, tidak ganda dan tidak hilang (#55).
test.use({ viewport: { width: 1440, height: 800 } })

/** Urutan teks butir dan pemisah ("/") seperti terlihat pengguna. */
async function urutan(page: Page): Promise<string[]> {
  return page.locator('nav[aria-label="Breadcrumb"] li').evaluateAll((lis) =>
    lis.flatMap((li) => Array.from(li.childNodes)
      .map((n) => (n.textContent ?? '').trim())
      .filter(Boolean)))
}

test('Detail guru: "Beranda / Guru / nama", tanpa garis miring ganda', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
  expect(await urutan(page)).toEqual(['Beranda', '/', 'Guru', '/', guru.nama])
  await expect(page.locator('nav[aria-label="Breadcrumb"] li[aria-current="page"]')).toHaveText(new RegExp(guru.nama))
})

test('Tambah guru dan Impor guru: tiga butir, dua pemisah', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  for (const [jalur, akhir] of [['/admin/guru/tambah', 'Tambah guru'], ['/admin/guru/impor', 'Impor guru']] as const) {
    await page.goto(jalur)
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
    expect(await urutan(page), jalur).toEqual(['Beranda', '/', 'Guru', '/', akhir])
  }
})

test('Dokumen periode: empat butir, tiga pemisah', async ({ page }) => {
  const { periode } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/periode/${periode.id}/dokumen`)
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
  expect(await urutan(page)).toEqual(['Beranda', '/', 'Periode', '/', periode.nama, '/', 'Dokumen'])
})

test('nama panjang terpotong dengan elipsis di ponsel tetapi terbaca penuh lewat title', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 })
  const { guru } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  const panjang = 'Dr. Hj. Siti Nurbaya Rahmawati Kusumawardhani, S.Pd., M.Pd., Gr.'
  await db.guru.update({ where: { id: guru.id }, data: { nama: panjang } })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)
  const teks = page.locator('nav[aria-label="Breadcrumb"] li[aria-current="page"] .breadcrumb__teks')
  // Halaman dialirkan (kerangka dulu, isi menyusul): tunggu isi benar-benar tampil sebelum mengukur.
  await expect(teks).toBeVisible()
  await expect(teks).toHaveAttribute('title', panjang)
  const m = await teks.evaluate((e) => ({ dipotong: e.scrollWidth > e.clientWidth, geser: document.documentElement.scrollWidth > document.documentElement.clientWidth }))
  expect(m.dipotong).toBe(true)
  expect(m.geser, 'halaman tidak boleh menggeser horizontal').toBe(false)
})

test('pemisah tersembunyi dari pembaca layar dan tidak pernah bersebelahan', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)
  const pemisah = page.locator('nav[aria-label="Breadcrumb"] .breadcrumb__pemisah')
  await expect(pemisah).toHaveCount(2)
  for (const el of await pemisah.all()) await expect(el).toHaveAttribute('aria-hidden', 'true')
  const u = await urutan(page)
  for (let i = 1; i < u.length; i++) expect(u[i] === '/' && u[i - 1] === '/').toBe(false)
})
