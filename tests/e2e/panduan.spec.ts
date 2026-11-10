import { test, expect } from '@playwright/test'
import { masuk, siapkan, buatAdmin } from './bantu'

test.describe('Halaman Panduan (/panduan) dan Tautan Panduan', () => {
  test('halaman /panduan dapat diakses publik tanpa login dan memiliki halaman mandiri per bagian', async ({ page }) => {
    const res = await page.goto('/panduan')
    expect(res?.status()).toBe(200)
    expect(page.url()).toContain('/panduan')

    await expect(page.locator('h1')).toContainText('Buku panduan aplikasi Verval Sertifikasi Guru')
    await expect(page.locator('#bagian-a')).toContainText('Bagian A · Panduan untuk guru')
    await expect(page.locator('#bagian-b')).toContainText('Bagian B · Panduan untuk admin')
    await expect(page.locator('#lampiran')).toContainText('Lampiran · Rujukan cepat')

    // Periksa daftar isi tautan di mobile fold
    const fold = page.locator('.panduan-toc-fold')
    await expect(fold).toBeVisible()
    await fold.locator('summary').click()
    await expect(fold.locator('a[href="/panduan/a1"]')).toBeVisible()
    await expect(fold.locator('a[href="/panduan/b1"]')).toBeVisible()
    await expect(fold.locator('a[href="/panduan/l1"]')).toBeVisible()

    // Periksa daftar isi di sidebar desktop
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('.panduan-toc-side a[href="/panduan/a1"]')).toBeVisible()
    await expect(page.locator('.panduan-toc-side a[href="/panduan/b1"]')).toBeVisible()
    await expect(page.locator('.panduan-toc-side a[href="/panduan/l1"]')).toBeVisible()

    // Buka halaman per bagian A1
    await page.goto('/panduan/a1')
    await expect(page.locator('h1')).toContainText('Masuk ke aplikasi')
    await expect(page.locator('img[src="/panduan/masuk.webp"]')).toBeVisible()
    await expect(page.locator('.panduan-nav-link--berikut[href="/panduan/a2"]')).toBeVisible()

    // Buka halaman bagian A5 (ada klip unggah)
    await page.goto('/panduan/a5')
    await expect(page.locator('h1')).toContainText('Mengunggah dokumen')
    await expect(page.locator('img[src="/panduan/klip-unggah.webp"]')).toBeVisible()

    // Buka halaman bagian B6 (ada klip periksa)
    await page.goto('/panduan/b6')
    await expect(page.locator('h1')).toContainText('Memeriksa dokumen (verval)')
    await expect(page.locator('img[src="/panduan/klip-periksa.webp"]')).toBeVisible()
  })

  test('tautan panduan ada di halaman masuk dan daftar', async ({ page }) => {
    await page.goto('/masuk')
    const tautanMasuk = page.locator('a[href="/panduan"]')
    await expect(tautanMasuk).toBeVisible()
    await expect(tautanMasuk).toHaveText('Panduan penggunaan')

    await page.goto('/daftar')
    const tautanDaftar = page.locator('a[href="/panduan"]')
    await expect(tautanDaftar).toBeVisible()
    await expect(tautanDaftar).toHaveText('Panduan penggunaan')
  })

  test('tautan panduan ada di footer halaman dokumen dan profil guru', async ({ page }) => {
    const { guru } = await siapkan({ dokumen: [] })
    await masuk(page, guru.username)

    await page.goto('/dokumen')
    const kakiDokumen = page.locator('.kaki-halaman a[href="/panduan"]')
    await expect(kakiDokumen).toBeVisible()

    await page.goto('/profil')
    const kakiProfil = page.locator('.kaki-halaman a[href="/panduan"]')
    await expect(kakiProfil).toBeVisible()
  })

  test('tautan panduan ada di sidebar admin (desktop) dan laci (ponsel)', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    // Ponsel: ada di laci setelah hamburger dibuka
    await page.goto('/admin')
    const tombolMenu = page.getByRole('button', { name: 'Buka menu navigasi' })
    const laci = page.locator('.admin-laci')
    await expect(async () => {
      if (!(await laci.isVisible())) await tombolMenu.click()
      await expect(laci).toBeVisible({ timeout: 1000 })
    }).toPass()
    const tautanLaci = laci.locator('a[href="/panduan"]')
    await expect(tautanLaci).toBeVisible()

    // Desktop: ada di sidebar
    await page.setViewportSize({ width: 1280, height: 800 })
    const tautanSidebar = page.locator('.admin-sidebar a[href="/panduan"]')
    await expect(tautanSidebar).toBeVisible()
  })

  test('pengguna yang sudah masuk tidak otomatis logout saat membuka /panduan', async ({ page }) => {
    // 1. Admin login dan buka panduan
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/panduan')

    // Harus menampilkan tombol kembali ke admin dan MenuProfil, bukan tombol "Masuk"
    await expect(page.locator('header a[href="/admin"]')).toHaveText('Ke Dashboard Admin')
    await expect(page.locator('.menu-profil')).toBeVisible()
    await expect(page.locator('header a[href="/masuk"]')).toHaveCount(0)

    // Pindah ke subhalaman /panduan/a1 tetap login
    await page.goto('/panduan/a1')
    await expect(page.locator('header a[href="/admin"]')).toHaveText('Ke Dashboard Admin')
    await expect(page.locator('.menu-profil')).toBeVisible()
    await expect(page.locator('header a[href="/masuk"]')).toHaveCount(0)

    // Klik tombol kembali membawa ke admin
    await page.locator('header a[href="/admin"]').click()
    await expect(page).toHaveURL(/\/admin/)

    // 2. Guru login dan buka panduan
    const { guru } = await siapkan({ dokumen: [] })
    await masuk(page, guru.username)
    await page.goto('/panduan')

    // Harus menampilkan tombol kembali ke dokumen dan MenuProfil, bukan tombol "Masuk"
    await expect(page.locator('header a[href="/dokumen"]')).toHaveText('Ke Dokumen Saya')
    await expect(page.locator('.menu-profil')).toBeVisible()
    await expect(page.locator('header a[href="/masuk"]')).toHaveCount(0)
  })
})
