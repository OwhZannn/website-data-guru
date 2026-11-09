import { test, expect, type Page } from '@playwright/test'

// Tombol mata di kolom sandi harus tepat di tengah isian, diam maupun saat di-hover/ditekan (#50).
const UKURAN = [
  { nama: 'lebar', width: 1440, height: 800 },
  { nama: 'ponsel', width: 375, height: 740 },
] as const
const SKEMA = ['light', 'dark'] as const

async function pusat(page: Page) {
  const mata = page.locator('.sandi-mata').first()
  const isian = page.locator('.sandi-bungkus input').first()
  const m = (await mata.boundingBox())!
  const i = (await isian.boundingBox())!
  return {
    selisih: Math.abs(m.y + m.height / 2 - (i.y + i.height / 2)),
    tinggiTombol: m.height,
    tinggiIsian: i.height,
    dalamIsian: m.x >= i.x && m.x + m.width <= i.x + i.width + 0.5,
    kotak: `${Math.round(m.x)},${Math.round(m.y)},${Math.round(m.width)},${Math.round(m.height)}`,
  }
}

for (const u of UKURAN) {
  for (const skema of SKEMA) {
    test(`tombol mata tepat di tengah isian (${u.nama}, ${skema})`, async ({ page }) => {
      await page.setViewportSize({ width: u.width, height: u.height })
      await page.emulateMedia({ colorScheme: skema })
      await page.goto('/masuk')
      await expect(page.locator('.sandi-mata').first()).toBeVisible()

      const diam = await pusat(page)
      expect(diam.selisih, 'pusat tombol vs isian (diam)').toBeLessThanOrEqual(1)
      expect(diam.dalamIsian, 'tombol berada di dalam isian').toBe(true)
      expect(diam.tinggiTombol, 'target klik setinggi isian').toBeGreaterThanOrEqual(Math.min(diam.tinggiIsian, 40))

      await page.locator('.sandi-mata').first().hover()
      const hover = await pusat(page)
      expect(hover.selisih, 'pusat tombol vs isian (hover)').toBeLessThanOrEqual(1)
      expect(hover.kotak, 'hover tidak menggeser atau mengubah ukuran tombol').toBe(diam.kotak)

      // Tekan: tombol tidak boleh bergeser (hanya sorotan di dalamnya yang mengecil).
      await page.mouse.down()
      const tekan = await pusat(page)
      await page.mouse.up()
      expect(tekan.kotak, 'menekan tidak menggeser tombol').toBe(diam.kotak)
    })
  }
}

test('tombol mata tetap berfungsi: menampilkan dan menyembunyikan sandi', async ({ page }) => {
  await page.goto('/masuk')
  const isian = page.locator('[name=sandi]')
  await expect(isian).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Tampilkan kata sandi' }).click()
  await expect(isian).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Sembunyikan kata sandi' }).click()
  await expect(isian).toHaveAttribute('type', 'password')
})
