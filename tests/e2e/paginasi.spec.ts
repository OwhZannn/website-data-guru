import { test, expect } from '@playwright/test'
import { db, masuk, buatAdmin } from './bantu'

test('daftar guru dibagi per halaman: 20 bawaan, bisa 50/100, dan berpindah halaman', async ({ page }) => {
  const admin = await buatAdmin()
  // 45 guru dengan awalan sama supaya pencarian hanya menampilkan mereka.
  const awal = `Paginasi${admin.id.slice(0, 5)}`
  await db.guru.createMany({
    data: Array.from({ length: 45 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0')
      return { nama: `${awal} ${n}`, username: `p${admin.id.slice(0, 5)}${n}`, nip: `p${admin.id.slice(0, 5)}${n}`, email: `p${n}${admin.id.slice(0, 5)}@contoh.id`, hashSandi: 'x' }
    }),
  })
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/guru?q=${awal}`)

  await expect(page.getByText('Menampilkan 1–20 dari 45 guru')).toBeVisible()
  await expect(page.getByRole('link', { name: `${awal} 20` })).toBeVisible()
  await expect(page.getByRole('link', { name: `${awal} 21` })).toHaveCount(0)

  await page.getByRole('navigation', { name: 'Halaman daftar guru' }).getByRole('link', { name: '3' }).click()
  await expect(page.getByText('Menampilkan 41–45 dari 45 guru')).toBeVisible()
  await expect(page.getByRole('link', { name: `${awal} 45` })).toBeVisible()

  // Ganti ke 50 per halaman: kembali ke halaman 1, pencarian tetap.
  await page.getByRole('navigation', { name: 'Jumlah per halaman' }).getByRole('link', { name: '50' }).click()
  await expect(page.getByText('Menampilkan 1–45 dari 45 guru')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Halaman daftar guru' }).getByRole('link', { name: '2' })).toHaveCount(0)
})

test('impor guru ada di halaman sendiri, terhubung dari daftar guru', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto('/admin/guru')
  await expect(page.getByLabel('Daftar guru', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Impor guru' }).click()
  await expect(page).toHaveURL('/admin/guru/impor')
  await expect(page.getByRole('heading', { name: 'Impor guru' })).toBeVisible()
  await expect(page.getByLabel('Daftar guru', { exact: true })).toBeVisible()
})
