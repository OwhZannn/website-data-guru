import { test, expect, type Page } from '@playwright/test'
import { masuk, buatAdmin, siapkan, bukaMenu } from './bantu'

const html = (page: Page) => page.locator('html')

test.describe('Tema terang/gelap/sistem', () => {
  test.use({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })

  test('pilihan Gelap tersimpan, bertahan setelah muat ulang, dan Sistem menghapusnya', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await expect(html(page)).not.toHaveAttribute('data-tema', /.+/)

    await bukaMenu(page)
    await page.getByRole('menuitemradio', { name: 'Gelap' }).click()
    await expect(html(page)).toHaveAttribute('data-tema', 'gelap')
    expect(await page.evaluate(() => localStorage.getItem('tema'))).toBe('gelap')
    // Latar benar-benar berubah menjadi gelap.
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(15, 26, 20)')

    await page.reload()
    await expect(html(page)).toHaveAttribute('data-tema', 'gelap')
    await bukaMenu(page)
    await expect(page.getByRole('menuitemradio', { name: 'Gelap' })).toHaveAttribute('aria-checked', 'true')

    await page.getByRole('menuitemradio', { name: 'Terang' }).click()
    await expect(html(page)).toHaveAttribute('data-tema', 'terang')

    await page.getByRole('menuitemradio', { name: 'Sistem' }).click()
    await expect(html(page)).not.toHaveAttribute('data-tema', /.+/)
    expect(await page.evaluate(() => localStorage.getItem('tema'))).toBeNull()
    await page.reload()
    await expect(html(page)).not.toHaveAttribute('data-tema', /.+/)
  })

  test('tema tersimpan terpasang sebelum digambar (tanpa kilatan)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('tema', 'gelap'))
    await page.goto('/masuk')
    // Atribut sudah ada pada saat DOM selesai dibaca, jauh sebelum hidrasi React.
    await expect(html(page)).toHaveAttribute('data-tema', 'gelap')
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(15, 26, 20)')
  })

  test('Terang menang atas perangkat berskema gelap, Sistem mengikuti perangkat', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => localStorage.setItem('tema', 'terang'))
    await page.goto('/masuk')
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(244, 246, 245)')
    await page.evaluate(() => { localStorage.removeItem('tema'); document.documentElement.removeAttribute('data-tema') })
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(15, 26, 20)')
  })

  test('halaman masuk punya pilihan tema yang bisa dioperasikan papan ketik', async ({ page }) => {
    await page.goto('/masuk')
    const grup = page.getByRole('radiogroup', { name: 'Tema tampilan' })
    await expect(grup).toBeVisible()
    await grup.getByRole('radio', { name: 'Gelap' }).click()
    await expect(html(page)).toHaveAttribute('data-tema', 'gelap')
    await page.keyboard.press('ArrowRight')
    await expect(html(page)).not.toHaveAttribute('data-tema', /.+/)
  })

  test('guru juga bisa mengganti tema dari kepala halaman', async ({ page }) => {
    const { guru } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
    await masuk(page, guru.username)
    await bukaMenu(page)
    await page.getByRole('menuitemradio', { name: 'Gelap' }).click()
    await expect(html(page)).toHaveAttribute('data-tema', 'gelap')
  })
})

test.describe('Menu profil', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('admin: nama, peran, buka/tutup dengan papan ketik, fokus kembali, Keluar mengakhiri sesi', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)

    const pemicu = page.getByRole('button', { name: /^Menu akun/ })
    await expect(pemicu).toHaveAttribute('aria-haspopup', 'menu')
    await expect(pemicu).toHaveAttribute('aria-expanded', 'false')
    await expect(pemicu).toContainText(admin.nama)
    await expect(pemicu).toContainText('Admin')

    // Enter membuka dan fokus pindah ke butir pertama
    await pemicu.focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('menu', { name: 'Menu akun' })
    await expect(menu).toBeVisible()
    await expect(pemicu).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('menuitem', { name: 'Akun saya' })).toBeFocused()

    // Panah menggeser fokus, Home/End melompat, berputar di ujung
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('menuitemradio', { name: 'Terang' })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('menuitemradio', { name: 'Gelap' })).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.getByRole('menuitem', { name: 'Keluar' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('menuitem', { name: 'Akun saya' })).toBeFocused()

    // Escape menutup dan mengembalikan fokus ke pemicu
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(pemicu).toBeFocused()
    await expect(pemicu).toHaveAttribute('aria-expanded', 'false')

    // Klik di luar menutup
    await pemicu.click()
    await expect(menu).toBeVisible()
    await page.locator('h1').first().click()
    await expect(menu).toBeHidden()

    // Keluar benar-benar mengakhiri sesi
    await pemicu.click()
    await page.getByRole('menuitem', { name: 'Keluar' }).click()
    await expect(page).toHaveURL('/masuk')
    await page.goto('/admin')
    await expect(page).toHaveURL('/masuk')
  })

  test('guru: nama, peran Guru, tautan Profil & kata sandi, dan Keluar', async ({ page }) => {
    const { guru } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
    await masuk(page, guru.username)
    const pemicu = page.getByRole('button', { name: /^Menu akun/ })
    await expect(pemicu).toContainText(guru.nama)
    await expect(pemicu).toContainText('Guru')
    await bukaMenu(page)
    await page.getByRole('menuitem', { name: 'Profil & kata sandi' }).click()
    await expect(page).toHaveURL('/profil')
    await bukaMenu(page)
    await page.getByRole('menuitem', { name: 'Keluar' }).click()
    await expect(page).toHaveURL('/masuk')
  })
})

test.describe('Hamburger menu', () => {
  test('tersembunyi di 1280px saat sidebar tampil', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await expect(page.locator('aside.admin-sidebar')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buka menu navigasi' })).toBeHidden()
  })

  test('terlihat di 360px dan sidebar tersembunyi', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await expect(page.getByRole('button', { name: 'Buka menu navigasi' })).toBeVisible()
    await expect(page.locator('aside.admin-sidebar')).toBeHidden()
  })
})

test.describe('Sidebar berkelompok', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('kelompok berjudul, lipat bertahan setelah muat ulang, tooltip dan badge', async ({ page }) => {
    await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    const sidebar = page.locator('aside.admin-sidebar')
    for (const judul of ['Utama', 'Data', 'Pengaturan']) await expect(sidebar.getByText(judul, { exact: true })).toBeVisible()
    await expect(sidebar.getByRole('navigation', { name: 'Menu admin' }).getByRole('link', { name: /Antrean/ })).toContainText(/\d/)

    const lebarBuka = (await sidebar.boundingBox())!.width
    const lipat = page.getByRole('button', { name: 'Lipat menu' })
    await lipat.focus()
    await page.keyboard.press('Enter')
    await expect(html(page)).toHaveAttribute('data-sidebar', 'lipat')
    await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(lebarBuka / 2)
    // Teks tetap tersedia bagi pembaca layar
    await expect(sidebar.getByRole('link', { name: /Guru/ })).toBeVisible()

    await page.reload()
    await expect(html(page)).toHaveAttribute('data-sidebar', 'lipat')
    await sidebar.getByRole('link', { name: /Guru/ }).hover()
    const tip = await sidebar.getByRole('link', { name: /Guru/ }).locator('xpath=..').evaluate((el) => getComputedStyle(el, '::after').content)
    expect(tip).toContain('Guru')

    // Indikator dev Next.js menutupi pojok kiri bawah dan mencegat klik tetikus; papan ketik tetap sah.
    const buka = page.getByRole('button', { name: 'Buka menu samping' })
    await buka.focus()
    await page.keyboard.press('Enter')
    await expect(html(page)).not.toHaveAttribute('data-sidebar', /.+/)
  })
})
