import { test, expect } from '@playwright/test'
import { masuk, buatAdmin } from './bantu'

test.describe('Sidebar admin — desktop (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('sidebar terlihat dan butir aktif memiliki aria-current=page', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await expect(page).toHaveURL('/admin')

    // Sidebar ada (aside yang terlihat, bukan laci)
    const sidebar = page.locator('aside.admin-sidebar')
    await expect(sidebar).toBeVisible()

    const nav = sidebar.getByRole('navigation', { name: 'Menu admin' })
    await expect(nav).toBeVisible()

    // Butir Beranda aktif di halaman beranda
    await expect(nav.getByRole('link', { name: /Beranda/ })).toHaveAttribute('aria-current', 'page')
    // Butir Guru tidak aktif
    await expect(nav.getByRole('link', { name: /Guru/ })).not.toHaveAttribute('aria-current', 'page')
  })

  test('navigasi ke Guru mengubah butir aktif', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    const sidebar = page.locator('aside.admin-sidebar')
    const nav = sidebar.getByRole('navigation', { name: 'Menu admin' })

    // Klik link Guru (URL mungkin mengandung ?periode=...)
    await nav.getByRole('link', { name: /Guru/ }).click()
    await expect(page).toHaveURL(/\/admin\/guru/)

    // Setelah navigasi, butir Guru aktif
    await expect(nav.getByRole('link', { name: /Guru/ })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: /Beranda/ })).not.toHaveAttribute('aria-current', 'page')
  })

  test('navigasi ke Periode mengubah butir aktif', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    const sidebar = page.locator('aside.admin-sidebar')
    const nav = sidebar.getByRole('navigation', { name: 'Menu admin' })

    await nav.getByRole('link', { name: /Periode/ }).click()
    await expect(page).toHaveURL(/\/admin\/periode/)
    await expect(nav.getByRole('link', { name: /Periode/ })).toHaveAttribute('aria-current', 'page')
  })

  test('sidebar bisa dilipat melalui tombol lipat', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    const tombol = page.getByRole('button', { name: 'Lipat menu' })
    await expect(tombol).toBeVisible()
    await tombol.click()

    // Setelah dilipat, tombol berganti label
    await expect(page.getByRole('button', { name: 'Buka menu samping' })).toBeVisible()
  })
})

test.describe('Navigasi mobile — laci (360×740)', () => {
  // Gunakan viewport default konfigurasi (360×740)
  test('tombol hamburger membuka laci navigasi', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await expect(page).toHaveURL('/admin')

    // Laci awalnya tidak terlihat (display: none)
    const laci = page.locator('.admin-laci')
    await expect(laci).not.toBeVisible()

    // Klik tombol hamburger
    const hamburger = page.getByRole('button', { name: 'Buka menu navigasi' })
    await expect(hamburger).toBeVisible()
    await hamburger.click()

    // Laci terbuka
    await expect(laci).toBeVisible()
  })

  test('butir aktif di laci memiliki aria-current=page', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await expect(page).toHaveURL('/admin')

    await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
    const laci = page.locator('.admin-laci')
    await expect(laci).toBeVisible()

    const berandaLink = laci.getByRole('link', { name: /Beranda/ })
    await expect(berandaLink).toHaveAttribute('aria-current', 'page')
  })

  test('laci bisa ditutup dengan tombol tutup', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
    const laci = page.locator('.admin-laci')
    await expect(laci).toBeVisible()

    await laci.getByRole('button', { name: 'Tutup menu' }).click()
    await expect(laci).not.toBeVisible()
  })

  test('navigasi mobile: klik Guru di laci membuka halaman Guru', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    await page.getByRole('button', { name: 'Buka menu navigasi' }).click()
    const laci = page.locator('.admin-laci')
    await laci.getByRole('link', { name: /Guru/ }).click()

    await expect(page).toHaveURL(/\/admin\/guru/)
  })
})
