import { test, expect, type Page } from '@playwright/test'
import { siapkan, masuk, buatAdmin, bukaMenu, pdf } from './bantu'

// Server e2e berjalan dengan CSP_TEGAKKAN=1 (lihat playwright.config.ts), jadi pelanggaran benar-benar memblokir.
function pantauCsp(page: Page) {
  const pelanggaran: string[] = []
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) pelanggaran.push(m.text())
  })
  return pelanggaran
}

test.use({ viewport: { width: 1280, height: 800 } })

test('header keamanan ada di halaman dan API', async ({ request }) => {
  const res = await request.get('/masuk')
  const csp = res.headers()['content-security-policy']
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
  expect(csp).toContain("frame-ancestors 'self'")
  expect(res.headers()['permissions-policy']).toContain('camera=()')
  const api = await request.get('/api/hidup')
  expect(api.headers()['permissions-policy']).toContain('camera=()')
  expect(api.headers()['x-content-type-options']).toBe('nosniff')
})

test('alur masuk, unggah, dan ganti tema guru tanpa pelanggaran CSP', async ({ page }) => {
  const pelanggaran = pantauCsp(page)
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await page.waitForLoadState('networkidle')
  await page.getByTestId(`berkas-${daftar[0].id}`).setInputFiles(pdf())
  await expect(page.getByText('Menunggu diperiksa')).toBeVisible()

  await bukaMenu(page)
  await page.getByRole('menuitemradio', { name: 'Gelap' }).click()
  await page.reload()
  // Skrip tema sebaris (bernonce) tetap berjalan sebelum hidrasi.
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'gelap')
  expect(pelanggaran).toEqual([])
})

test('pratinjau PDF admin (pdf.js + worker) tanpa pelanggaran CSP', async ({ page }) => {
  const pelanggaran = pantauCsp(page)
  const { guru } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)
  await expect(page.locator('canvas.pdf-canvas')).toBeVisible()
  await expect(page.locator('iframe.pratinjau-iframe')).toHaveCount(0)
  expect(pelanggaran).toEqual([])
})
