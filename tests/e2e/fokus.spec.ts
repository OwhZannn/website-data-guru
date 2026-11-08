import { test, expect } from '@playwright/test'
import { siapkan, masuk, buatAdmin } from './bantu'

test('laci menu ponsel: fokus masuk, Tab terkunci, Escape mengembalikan fokus', async ({ page }) => {
  await siapkan({ dokumen: [{ status: 'BELUM' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin')

  const pembuka = page.getByRole('button', { name: 'Buka menu navigasi' })
  await pembuka.click()
  const laci = page.getByRole('dialog', { name: 'Menu admin' })
  await expect(laci).toBeVisible()
  await expect.poll(() => laci.evaluate((el) => el.contains(document.activeElement))).toBe(true)

  // Tab berkali-kali tetap di dalam laci.
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
  expect(await laci.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Shift+Tab')
  expect(await laci.evaluate((el) => el.contains(document.activeElement))).toBe(true)

  await page.keyboard.press('Escape')
  await expect(laci).toBeHidden()
  await expect(pembuka).toBeFocused()
})

test('dialog konfirmasi: fokus di dalam, Escape menutup dan fokus kembali ke pemicu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const { guru } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }, { status: 'MENUNGGU' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)

  const pemicu = page.getByTestId('tombol-sahkan-massal')
  await pemicu.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(pemicu).toBeFocused()
})
