import { test, expect } from '@playwright/test'
import { masuk, buatAdmin, siapkan, db } from './bantu'

test.use({ viewport: { width: 1440, height: 900 } })

test('tombol koreksi menetap saat daftar tugas memanjang', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  const tombol = page.getByRole('button', { name: 'Koreksi profil dan tugas' })
  const sebelum = await tombol.boundingBox()
  await db.guru.update({ where: { id: guru.id }, data: { tugasLabPerpus: true, tugasRohis: true, tugasInklusi: true, tugasWakasek: true, tugasOsis: true } })
  await page.reload()
  const sesudah = await tombol.boundingBox()
  const profil = await page.locator('.detail-profil').boundingBox()
  expect(Math.abs(sesudah!.y - sebelum!.y)).toBeLessThan(2)
  expect(sesudah!.x + sesudah!.width).toBeGreaterThan(profil!.x + profil!.width - 40)
})

test('modal: header dan footer tetap, tugas tambahan dipilih lewat pil', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  await page.getByRole('button', { name: 'Koreksi profil dan tugas' }).click()

  const dialog = page.locator('dialog.modal-profil')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Koreksi Profil dan Tugas Guru' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Simpan profil' })).toBeVisible()
  await expect(dialog.locator('.combobox-input')).toHaveCount(0)

  const wali = dialog.getByLabel('Wali kelas')
  await wali.check({ force: true })
  await expect(wali).toBeChecked()
  await expect.poll(async () => (await db.guru.findUniqueOrThrow({ where: { id: guru.id } })).tugasWaliKelas).toBe(true)
  await expect(dialog.getByText('1 dipilih')).toBeVisible()
  await wali.uncheck({ force: true })
  await expect.poll(async () => (await db.guru.findUniqueOrThrow({ where: { id: guru.id } })).tugasWaliKelas).toBe(false)

  // Radio tanpa deskripsi sejajar tengah dengan kotaknya.
  const guruRadio = dialog.locator('label.centang', { hasText: /^Guru$/ })
  const [kotak, radio] = await Promise.all([guruRadio.boundingBox(), guruRadio.locator('input').boundingBox()])
  expect(Math.abs((radio!.y + radio!.height / 2) - (kotak!.y + kotak!.height / 2))).toBeLessThan(2)

  await dialog.getByRole('button', { name: 'Tutup modal' }).click()
  await expect(dialog).not.toBeVisible()
})
