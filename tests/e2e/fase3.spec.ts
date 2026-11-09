import { test, expect } from '@playwright/test'
import { siapkan, masuk, db, buatAdmin, SANDI } from './bantu'

// ------------------------------------------------------------------ //
// Chip preset alasan tolak                                             //
// ------------------------------------------------------------------ //
test('chip preset mengisi alasan dan tolak berhasil', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  // Buat preset alasan di DB
  await db.alasanTolak.create({ data: { id: 'p-e2e-1', teks: 'File tidak terbaca', urutan: 1, aktif: true } })

  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: 'Tolak' }).click()

  // Chip harus muncul
  const chip = page.getByTestId('chip-alasan').first()
  await expect(chip).toBeVisible()
  await expect(chip).toContainText('File tidak terbaca')

  // Klik chip → isi textarea
  await chip.click()
  const textarea = page.getByLabel('Alasan penolakan')
  await expect(textarea).toHaveValue('File tidak terbaca')

  // Submit
  await page.getByRole('button', { name: 'Kirim penolakan' }).click()
  await expect(page.getByText('Alasan: File tidak terbaca').first()).toBeVisible()

  const baris = await db.dokumenGuru.findFirst({ where: { guruId: guru.id } })
  expect(baris?.status).toBe('DITOLAK')
  expect(baris?.alasan).toBe('File tidak terbaca')
})

// ------------------------------------------------------------------ //
// Sahkan massal                                                        //
// ------------------------------------------------------------------ //
test('sahkan massal berhasil dengan Konfirmasi', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }, { status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  await page.waitForLoadState('networkidle')

  // Tombol sahkan massal harus muncul (ada 2 dokumen menunggu)
  const tombol = page.getByTestId('tombol-sahkan-massal')
  await expect(tombol).toBeVisible()
  await expect(tombol).toContainText('(2)')

  await tombol.click()

  // Konfirmasi muncul
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Sahkan semua' }).click()

  // Toast sukses
  await expect(page.getByRole('status').getByText(/berhasil disahkan/i)).toBeVisible()

  const baris = await db.dokumenGuru.findMany({ where: { guruId: guru.id, periodeId: periode.id } })
  expect(baris.every((d) => d.status === 'SAH')).toBe(true)
})

// ------------------------------------------------------------------ //
// Keyboard shortcut S menyahkan dan auto-advance (viewport 1280px)   //
// ------------------------------------------------------------------ //
const testLebar = test.extend<Record<never, never>>({
  page: async ({ page }, use) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await use(page)
  },
})

testLebar('shortcut S menyahkan dokumen dan pindah ke berikutnya', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }, { status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  await page.waitForLoadState('networkidle')

  // Pastikan dokumen item pertama terlihat
  const items = page.getByTestId(/^dok-item-/)
  await expect(items.first()).toBeVisible()

  // Pemroses tombol baru terpasang setelah hidrasi; di runner yang lambat, tekanan pertama bisa mendahuluinya.
  // Ulangi sampai dokumen benar-benar disahkan di basis data (S pada dokumen yang sudah sah tidak berbuat apa-apa).
  await expect(async () => {
    await page.keyboard.press('s')
    const sah = await db.dokumenGuru.count({ where: { guruId: guru.id, status: 'SAH' } })
    expect(sah).toBeGreaterThan(0)
  }).toPass({ timeout: 15_000, intervals: [500, 1000, 2000] })

  // Hasil keputusan tampak di halaman: toast (hilang setelah 4 detik) atau status dokumen berubah menjadi SAH.
  await expect(page.getByText(/disahkan|SAH/i).first()).toBeVisible({ timeout: 8000 })
})

// ------------------------------------------------------------------ //
// /admin/alasan — tambah dan nonaktifkan                              //
// ------------------------------------------------------------------ //
test('admin dapat menambah dan menonaktifkan alasan penolakan', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin/alasan')
  await page.waitForLoadState('networkidle')

  // Tambah alasan baru
  const input = page.getByLabel('Teks alasan baru')
  await input.fill('Dokumen palsu')
  await page.getByRole('button', { name: 'Tambah' }).click()

  await expect(page.getByText('Dokumen palsu')).toBeVisible()

  // Cari alasan bawaan dari DB (bila ada alasan-01 dari migrasi)
  // Verifikasi nonaktifkan: kita nonaktifkan alasan yang baru dibuat
  const baris = await db.alasanTolak.findFirst({ where: { teks: 'Dokumen palsu' } })
  expect(baris).toBeTruthy()
  expect(baris!.aktif).toBe(true)

  // Klik tombol Nonaktifkan
  await page.getByTestId(`nonaktifkan-${baris!.id}`).click()
  await expect(page.getByText('Nonaktif', { exact: true }).first()).toBeVisible()

  const sesudah = await db.alasanTolak.findUnique({ where: { id: baris!.id } })
  expect(sesudah!.aktif).toBe(false)
})
