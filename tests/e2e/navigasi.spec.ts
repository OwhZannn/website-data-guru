import { test, expect, type Page } from '@playwright/test'
import { db, masuk, buatAdmin, siapkan, SANDI } from './bantu'
import { hashSandi } from '../../src/lib/sandi'

// Navigasi mulus (#53): berpindah antar halaman admin tanpa memuat ulang dokumen.
test.use({ viewport: { width: 1440, height: 900 } })

const sidebar = (page: Page, href: string) =>
  page.locator(`aside.admin-sidebar a.admin-nav-butir[href${href === '/admin' ? '="/admin"' : `^="${href}"`}]`)

async function tungguHalaman(page: Page, judul: string) {
  await expect(page.locator('main h1').first()).toHaveText(judul)
}

test('klik sidebar tidak memuat ulang dokumen: penanda di window bertahan dan tidak ada permintaan dokumen baru', async ({ page }) => {
  await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin')
  await expect(sidebar(page, '/admin/guru')).toBeVisible()
  await page.evaluate(() => { (window as unknown as { __tanda: number }).__tanda = 1 })

  const dokumen: string[] = []
  page.on('request', (r) => { if (r.resourceType() === 'document') dokumen.push(r.url()) })

  for (const [href, judul] of [['/admin/guru', 'Guru'], ['/admin/antrean', 'Antrean pemeriksaan'], ['/admin', 'Beranda Admin'], ['/admin/periode', 'Periode']] as const) {
    await sidebar(page, href).click()
    await expect(page).toHaveURL(new RegExp(`${href}(\\?|$)`))
    await tungguHalaman(page, judul)
    expect(await page.evaluate(() => (window as unknown as { __tanda?: number }).__tanda), `penanda hilang setelah ke ${href}`).toBe(1)
  }
  expect(dokumen, 'tidak boleh ada permintaan dokumen HTML baru').toEqual([])
})

test('tombol Kembali dan Maju memulihkan halaman sebelumnya tanpa muat ulang', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin')
  await page.evaluate(() => { (window as unknown as { __tanda: number }).__tanda = 1 })
  await sidebar(page, '/admin/guru').click()
  await tungguHalaman(page, 'Guru')
  await sidebar(page, '/admin/antrean').click()
  await tungguHalaman(page, 'Antrean pemeriksaan')

  await page.goBack()
  await expect(page).toHaveURL(/\/admin\/guru$/)
  await tungguHalaman(page, 'Guru')
  await page.goBack()
  await expect(page).toHaveURL(/\/admin$/)
  await tungguHalaman(page, 'Beranda Admin')
  await page.goForward()
  await expect(page).toHaveURL(/\/admin\/guru$/)
  expect(await page.evaluate(() => (window as unknown as { __tanda?: number }).__tanda)).toBe(1)
})

test('urut kolom dan paginasi di Guru memperbarui alamat tanpa muat ulang dan tanpa menggulirkan halaman ke atas', async ({ page }) => {
  const admin = await buatAdmin()
  const awal = `Nav${admin.id.slice(0, 5)}`
  const hash = await hashSandi(SANDI)
  await db.guru.createMany({
    data: Array.from({ length: 30 }, (_, i) => ({
      nama: `${awal} ${String(i).padStart(2, '0')}`, username: `${awal}${i}`, nip: `${awal}${i}`,
      email: `${awal}${i}@contoh.id`, hashSandi: hash,
    })),
  })
  await masuk(page, admin.email)
  await page.goto(`/admin/guru?q=${awal}&per=20`)
  await expect(page.getByRole('link', { name: `${awal} 00` })).toBeVisible()
  await page.evaluate(() => { (window as unknown as { __tanda: number }).__tanda = 1 })
  const dokumen: string[] = []
  page.on('request', (r) => { if (r.resourceType() === 'document') dokumen.push(r.url()) })

  await page.getByRole('link', { name: /Berikutnya/ }).click()
  await expect(page).toHaveURL(/hal=2/)
  await expect(page.getByRole('link', { name: `${awal} 20` })).toBeVisible()

  await page.locator('th a.tajuk-urut').first().click()
  await expect(page).toHaveURL(/urut=/)
  expect(await page.evaluate(() => (window as unknown as { __tanda?: number }).__tanda)).toBe(1)
  expect(dokumen).toEqual([])
})

test('unduh rekap tetap mengunduh berkas (tautan /api/ bukan navigasi sisi klien)', async ({ page }) => {
  await siapkan({ dokumen: [{ status: 'SAH' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin')
  await page.locator('.unduh-rekap summary').click()
  const unduh = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Unduh rekap CSV' }).click()
  const berkas = await unduh
  expect(berkas.suggestedFilename()).toMatch(/\.csv$/)
})

test('klik tengah membuka tab baru, bukan mengganti halaman ini', async ({ page, context }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin')
  const linkGuru = sidebar(page, '/admin/guru')
  await expect(linkGuru).toBeVisible()
  const [tabBaru] = await Promise.all([
    context.waitForEvent('page'),
    linkGuru.click({ button: 'middle' }),
  ])
  await tabBaru.waitForLoadState('domcontentloaded')
  expect(tabBaru.url()).toContain('/admin/guru')
  await expect(page).toHaveURL(/\/admin$/)
  await tabBaru.close()
})

test('bilah kemajuan tampil saat berpindah ke rute yang lambat, lalu selesai', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin')
  await expect(sidebar(page, '/admin/antrean')).toBeVisible()
  // Perlambat hanya permintaan RSC ke Antrean supaya keadaan "sedang pindah" bisa diamati.
  await page.route(/\/admin\/antrean/, async (route) => {
    if (route.request().headers()['rsc'] || route.request().url().includes('_rsc')) {
      await new Promise((r) => setTimeout(r, 1200))
    }
    await route.continue()
  })
  const bilah = page.locator('.bilah-navigasi')
  await sidebar(page, '/admin/antrean').click()
  await expect(bilah).toHaveAttribute('data-fase', 'jalan', { timeout: 2000 })
  await expect(sidebar(page, '/admin/antrean')).toHaveAttribute('aria-busy', 'true')
  await tungguHalaman(page, 'Antrean pemeriksaan')
  await expect(bilah).not.toHaveAttribute('data-fase', 'jalan')
  await expect(sidebar(page, '/admin/antrean')).not.toHaveAttribute('aria-busy', 'true')
  await page.unroute(/\/admin\/antrean/)
})

test('muat penuh dengan sidebar terlipat: atribut lipat sudah ada pada saat DOM pertama dibentuk, sebelum hidrasi', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  // Skrip ini berjalan sebelum skrip halaman mana pun; ia merekam nilai atribut saat <body> pertama kali muncul.
  await page.addInitScript(() => {
    localStorage.setItem('admin-sidebar-collapsed', '1')
    const w = window as unknown as { __awal?: string | null }
    // Cat pertama terjadi setelah <head> selesai diurai; tangkap atribut tepat saat <body> dibuat.
    const ambil = () => { if (w.__awal === undefined && document.body) w.__awal = document.documentElement.getAttribute('data-sidebar') }
    new MutationObserver(ambil).observe(document, { childList: true, subtree: true })
    document.addEventListener('readystatechange', ambil)
    document.addEventListener('DOMContentLoaded', ambil)
  })
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  expect(await page.evaluate(() => (window as unknown as { __awal?: string | null }).__awal), 'atribut saat <body> pertama muncul').toBe('lipat')
  expect(await page.evaluate(() => document.documentElement.dataset.sidebar)).toBe('lipat')
})
