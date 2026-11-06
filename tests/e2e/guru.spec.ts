import { test, expect } from '@playwright/test'
import { siapkan, masuk, db, pdf } from './bantu'

test('guru melihat alasan penolakan dan bisa mengunggah ulang', async ({ page }) => {
  const { guru, periode, daftar } = await siapkan({ dokumen: [{ status: 'DITOLAK', alasan: 'Scan kurang jelas' }] })
  await db.riwayat.create({
    data: { periodeId: periode.id, guruId: guru.id, dokumenId: daftar[0].id, aksi: 'tolak', alasan: 'Scan kurang jelas', oleh: 'admin', olehTipe: 'admin' },
  })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Alasan penolakan: Scan kurang jelas')).toBeVisible()
  await expect(page.getByRole('list', { name: /Riwayat/ }).getByText(/Scan kurang jelas/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unggah ulang' })).toBeVisible()
  await expect(page.getByText('Progres: 0 dari 1 dokumen sah')).toBeVisible()

  await page.waitForLoadState('networkidle') // pastikan hidrasi selesai
  await page.getByTestId(`berkas-${daftar[0].id}`).setInputFiles(pdf())
  await expect(page.getByText('Menunggu diperiksa')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ganti file' })).toBeVisible()
})

test('dokumen yang sudah sah tidak bisa diganti', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'SAH' }, { status: 'MENUNGGU' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('SAH', { exact: true })).toBeVisible()
  await expect(page.getByText('Progres: 1 dari 2 dokumen sah')).toBeVisible()
  // hanya satu tombol (milik dokumen yang menunggu); kartu sah tanpa tombol
  await expect(page.getByRole('button', { name: /Unggah|Ganti file/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Ganti file' })).toHaveCount(1)
})

test('masa unggah ditutup: tanpa tombol unggah', async ({ page }) => {
  const { guru } = await siapkan({ dibuka: false, dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.username)
  await expect(page.getByText('Masa pengunggahan sedang ditutup.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Unggah|Ganti file/ })).toHaveCount(0)
})

test('sandi salah menampilkan galat', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [] })
  await masuk(page, guru.username, 'salah-salah')
  await expect(page.getByText('Username atau kata sandi salah')).toBeVisible()
})

test('jaringan putus: tampil pesan dan tombol coba lagi mengirim ulang berkas yang sama', async ({ page }) => {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await page.waitForLoadState('networkidle')
  await page.route('**/api/dokumen/unggah', (r) => r.abort('failed'))
  await page.getByTestId(`berkas-${daftar[0].id}`).setInputFiles(pdf())
  await expect(page.getByText('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')).toBeVisible()
  await expect(page.getByText('Belum diunggah')).toBeVisible()
  await page.unroute('**/api/dokumen/unggah')
  await page.getByRole('button', { name: 'Coba lagi' }).click()
  await expect(page.getByText('Menunggu diperiksa')).toBeVisible()
})

test('tanpa sesi, /dokumen mengarah ke /masuk', async ({ page }) => {
  await page.goto('/dokumen')
  await expect(page).toHaveURL('/masuk')
})

test('sesi berakhir (401) menampilkan tautan masuk', async ({ page }) => {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await page.waitForLoadState('networkidle')
  await page.route('**/api/dokumen/unggah', (r) => r.fulfill({ status: 401, body: '' }))
  await page.getByTestId(`berkas-${daftar[0].id}`).setInputFiles(pdf())
  await expect(page.getByText('Sesi Anda berakhir.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Silakan masuk lagi.' })).toHaveAttribute('href', '/masuk')
})

test('memilih berkas yang sama lagi setelah gagal tetap mengunggah', async ({ page }) => {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await page.waitForLoadState('networkidle')
  await page.route('**/api/dokumen/unggah', (r) =>
    r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, pesan: 'Isi berkas bukan PDF atau JPG yang sah' }) }))
  const input = page.getByTestId(`berkas-${daftar[0].id}`)
  const f = { ...pdf() }
  await input.setInputFiles(f)
  await expect(page.getByText('Isi berkas bukan PDF atau JPG yang sah')).toBeVisible()
  await expect(input).toHaveValue('')
  await page.unroute('**/api/dokumen/unggah')
  await input.setInputFiles(f)
  await expect(page.getByText('Menunggu diperiksa')).toBeVisible()
})
