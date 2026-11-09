import { test, expect } from '@playwright/test'
import { siapkan, masuk, db, buatAdmin } from './bantu'

test('admin menolak dengan alasan, lalu guru melihat alasannya', async ({ page, context }) => {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.getByRole('link', { name: guru.nama }).click()
  await expect(page.getByRole('heading', { name: 'Detail Guru' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Buka di Drive/i }).first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Tolak' }).click()
  await page.getByLabel('Alasan penolakan').fill('Stempel terpotong')
  await page.getByRole('button', { name: 'Kirim penolakan' }).click()
  await expect(page.getByText('Alasan: Stempel terpotong').first()).toBeVisible()
  await expect(page.getByText(`WITA — Ditolak oleh ${admin.nama} (admin): Stempel terpotong`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Batalkan keputusan' })).toBeVisible()

  const baris = await db.dokumenGuru.findFirst({ where: { guruId: guru.id, dokumenId: daftar[0].id } })
  expect(baris).toMatchObject({ status: 'DITOLAK', alasan: 'Stempel terpotong', diperiksaOleh: admin.id })

  // admin tidak boleh masuk halaman guru
  await page.goto('/dokumen')
  await expect(page).toHaveURL('/admin')

  await context.clearCookies()
  await masuk(page, guru.username)
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

test('admin mengunduh rekap CSV berisi header dan guru', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'SAH' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto('/admin/periode')
  const item = page.locator(`tr[data-periode="${periode.nama}"]`)
  const [unduhan] = await Promise.all([page.waitForEvent('download'), item.getByRole('link', { name: 'Rekap CSV' }).click()])
  expect(unduhan.suggestedFilename()).toMatch(/^rekap-.*\.csv$/)
  const { readFile } = await import('node:fs/promises')
  const isi = await readFile((await unduhan.path())!, 'utf8')
  expect(isi).toContain('NIP;NIK;Nama;Asal Sekolah;Jabatan;Status Kepegawaian;Tahun Sertifikasi;Sertifikasi Baru;Dokumen Sah;Dokumen Wajib;Status;Tanggal Verifikasi')
  expect(isi).toContain(guru.nama)
})

test('admin menyaring daftar guru berdasarkan status lengkap', async ({ page }) => {
  const lengkap = await siapkan({ dokumen: [{ status: 'SAH' }] })
  const admin = await buatAdmin()
  const lain = await db.guru.create({ data: { nama: `Belum ${admin.id.slice(0, 6)}`, username: `b${admin.id.slice(0, 6)}`, nip: `b${admin.id.slice(0, 6)}`, email: `b${admin.id.slice(0, 6)}@contoh.id`, hashSandi: 'x' } })
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto('/admin/guru?per=100') // data tes bisa lebih dari 20 guru
  await expect(page.getByRole('link', { name: lain.nama })).toBeVisible()
  // Chip status langsung menerapkan filter, tanpa tombol terapkan.
  await expect(page.getByRole('button', { name: /Terapkan/ })).toHaveCount(0)
  await page.getByRole('group', { name: 'Filter status' }).getByRole('link', { name: 'Lengkap' }).click()
  await expect(page).toHaveURL(/status=lengkap/)
  await expect(page.getByRole('link', { name: lengkap.guru.nama })).toBeVisible()
  await expect(page.getByRole('link', { name: lain.nama })).toHaveCount(0)
})

test('admin menambah admin baru yang bisa masuk dengan sandi yang ditampilkan', async ({ page, context }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto('/admin/admin')
  await page.waitForLoadState('networkidle')
  const email = `Baru-${admin.id.slice(0, 6)}@Contoh.id`
  await page.getByLabel('Nama admin').fill('Admin Baru')
  await page.getByLabel('Email admin').fill(email)
  await page.getByRole('button', { name: 'Tambah admin' }).click()
  const sandi = (await page.getByTestId('sandi-baru').textContent())!
  await expect(page.getByText(/hanya tampil sekali/)).toBeVisible()
  await context.clearCookies()
  await masuk(page, email, sandi)
  await expect(page).toHaveURL(/\/admin|\/ganti-sandi/)
})
