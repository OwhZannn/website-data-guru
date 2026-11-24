import { test, expect } from '@playwright/test'
import { siapkan, masuk, db, buatAdmin } from './bantu'

const JAM = 3_600_000

test('admin mengatur tenggat; guru melihat batas unggah dan sisa waktunya', async ({ page, context }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  const admin = await buatAdmin()
  await page.setViewportSize({ width: 1280, height: 800 })
  await masuk(page, admin.email)
  await page.goto('/admin/periode')
  const baris = page.locator(`tr[data-periode="${periode.nama}"]`)
  await expect(baris.getByText('Tanpa tenggat')).toBeVisible()
  await baris.getByRole('button', { name: `Atur tenggat ${periode.nama}` }).click()
  await baris.getByLabel(`Hari terakhir unggah ${periode.nama}`).fill('2099-01-31')
  await baris.getByRole('button', { name: 'Simpan' }).click()
  await expect(baris.getByText('Tenggat 31 Jan 2099')).toBeVisible()
  expect((await db.periode.findUniqueOrThrow({ where: { id: periode.id } })).tenggat?.toISOString()).toBe('2099-01-31T16:00:00.000Z')

  await context.clearCookies()
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByTestId('tenggat')).toContainText('Batas unggah: Sabtu, 31 Januari 2099 pukul 24.00 WITA')
  await expect(page.getByTestId('tenggat')).not.toHaveClass(/mendesak/)
})

test('sisa waktu ≤ 3 hari ditandai mendesak', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await db.periode.update({ where: { id: periode.id }, data: { tenggat: new Date(Date.now() + 5.5 * JAM) } })
  await masuk(page, guru.username)
  await expect(page.getByTestId('tenggat')).toContainText('5 jam lagi')
  await expect(page.getByTestId('tenggat')).toHaveClass(/mendesak/)
})

test('periode lewat tenggat tertutup otomatis: tombol unggah hilang dan tercatat di riwayat', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await db.periode.update({ where: { id: periode.id }, data: { tenggat: new Date(Date.now() - 1000) } })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Masa pengunggahan sedang ditutup.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unggah' })).toHaveCount(0)
  expect((await db.periode.findUniqueOrThrow({ where: { id: periode.id } })).dibuka).toBe(false)
  expect(await db.riwayat.count({ where: { periodeId: periode.id, aksi: 'tutup_periode', oleh: 'sistem' } })).toBe(1)
})
