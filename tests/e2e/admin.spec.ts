import { test, expect } from '@playwright/test'
import { siapkan, masuk, db, buatAdmin } from './bantu'

test('admin menolak dengan alasan, lalu guru melihat alasannya', async ({ page, context }) => {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.getByRole('link', { name: guru.nama }).click()
  await expect(page.getByRole('heading', { name: 'Detail Guru' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Buka file' })).toHaveAttribute('href', 'https://drive.google.com/file/d/palsu-1/view')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Tolak' }).click()
  await page.getByLabel('Alasan penolakan').fill('Stempel terpotong')
  await page.getByRole('button', { name: 'Kirim penolakan' }).click()
  await expect(page.getByText('Alasan: Stempel terpotong')).toBeVisible()
  await expect(page.getByText(/WITA — Ditolak oleh admin: Stempel terpotong/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Batalkan keputusan' })).toBeVisible()

  const baris = await db.dokumenGuru.findFirst({ where: { guruId: guru.id, dokumenId: daftar[0].id } })
  expect(baris).toMatchObject({ status: 'DITOLAK', alasan: 'Stempel terpotong', diperiksaOleh: admin.id })

  // admin tidak boleh masuk halaman guru
  await page.goto('/dokumen')
  await expect(page).toHaveURL('/admin')

  await context.clearCookies()
  await masuk(page, guru.email)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Alasan penolakan: Stempel terpotong')).toBeVisible()
  // guru tidak boleh masuk halaman admin
  await page.goto('/admin')
  await expect(page).toHaveURL('/dokumen')
})

test('menolak dengan alasan kosong menampilkan galat dan tidak mengubah apa pun', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/guru/${guru.id}`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Tolak' }).click()
  await page.getByLabel('Alasan penolakan').fill('   ')
  await page.getByRole('button', { name: 'Kirim penolakan' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Alasan penolakan wajib diisi' })).toBeVisible()

  const baris = await db.dokumenGuru.findFirst({ where: { guruId: guru.id } })
  expect(baris).toMatchObject({ status: 'MENUNGGU', alasan: null, diperiksaOleh: null })
  expect(await db.riwayat.count({ where: { guruId: guru.id } })).toBe(0)
})
