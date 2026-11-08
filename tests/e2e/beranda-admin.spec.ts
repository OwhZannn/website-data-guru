import { test, expect } from '@playwright/test'
import { siapkan, masuk, buatAdmin, db } from './bantu'

test('beranda admin menampilkan EmptyState bila tidak ada periode', async ({ page }) => {
  // Pastikan tidak ada periode sama sekali
  await db.riwayat.deleteMany()
  await db.dokumenGuru.deleteMany()
  await db.daftarDokumen.deleteMany()
  await db.periode.deleteMany()

  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await expect(page.getByText('Belum ada periode')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Buat periode' })).toHaveAttribute('href', '/admin/periode')
})

test('beranda admin menampilkan stat cards yang mengarah ke halaman guru', async ({ page }) => {
  const { guru, periode, daftar } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')

  // Judul halaman
  await expect(page.getByRole('heading', { name: 'Beranda Admin' })).toBeVisible()

  // Stat cards harus ada (pakai role link agar tidak ambigu dengan teks lain di halaman)
  await expect(page.getByRole('link', { name: /Total guru aktif/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Menunggu diperiksa/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ada yang ditolak/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Belum mulai/ })).toBeVisible()

  // Link stat card "Menunggu diperiksa" mengarah ke /admin/guru?status=perlu-dicek&periode=...
  const kartuMenunggu = page.getByRole('link', { name: /Menunggu diperiksa/ })
  await expect(kartuMenunggu).toHaveAttribute('href', new RegExp(`status=perlu-dicek`))
  await expect(kartuMenunggu).toHaveAttribute('href', new RegExp(`periode=${periode.id}`))

  // Link stat card "Lengkap"
  const kartuLengkap = page.getByRole('link', { name: /Lengkap/ })
  await expect(kartuLengkap).toHaveAttribute('href', new RegExp(`status=lengkap`))

  // Link stat card "Ada yang ditolak"
  const kartuTolak = page.getByRole('link', { name: /Ada yang ditolak/ })
  await expect(kartuTolak).toHaveAttribute('href', new RegExp(`status=ada-ditolak`))

  // Link stat card "Belum mulai"
  const kartuBelum = page.getByRole('link', { name: /Belum mulai/ })
  await expect(kartuBelum).toHaveAttribute('href', new RegExp(`status=belum-mulai`))
})

test('beranda admin menampilkan antrean pemeriksaan', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')

  await expect(page.getByRole('heading', { name: 'Antrean pemeriksaan' })).toBeVisible()
  await expect(page.getByRole('link', { name: guru.nama })).toBeVisible()
})

test('beranda admin menampilkan link unduh rekap XLSX dan CSV', async ({ page }) => {
  await siapkan({ dokumen: [] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')

  // Buka dropdown unduh
  const details = page.locator('.unduh-rekap')
  await details.locator('summary').click()
  await expect(page.getByRole('link', { name: 'Unduh rekap XLSX' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Unduh rekap CSV' })).toBeVisible()
})
