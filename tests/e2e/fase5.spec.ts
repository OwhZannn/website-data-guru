import { test, expect } from '@playwright/test'
import { db, siapkan, masuk } from './bantu'

test('kartu langkah berikutnya menampilkan hitungan status yang benar', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'DITOLAK', alasan: 'Buram' }, { status: 'BELUM' }, { status: 'MENUNGGU' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')

  const kartu = page.getByTestId('langkah-berikutnya')
  await expect(kartu).toBeVisible()
  await expect(kartu.getByTestId('hitung-ditolak')).toHaveText('1')
  await expect(kartu.getByTestId('hitung-belum')).toHaveText('1')
  await expect(kartu.getByTestId('hitung-menunggu')).toHaveText('1')
  await expect(kartu.getByRole('link', { name: /perlu tindakan/i })).toBeVisible()
})

test('kartu langkah berikutnya tidak tampil saat semua dokumen SAH (SIAGA muncul)', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'SAH' }, { status: 'SAH' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')

  await expect(page.getByTestId('langkah-berikutnya')).toHaveCount(0)
  await expect(page.getByText(/Berkas Anda sudah lulus verval/)).toBeVisible()
})

test('dokumen DITOLAK muncul sebelum BELUM dalam kelompok perlu tindakan', async ({ page }) => {
  // Buat dua dokumen: BELUM (urutan 0) dan DITOLAK (urutan 1) — DITOLAK harus muncul lebih dulu.
  const { guru, periode } = await siapkan({ dokumen: [] })
  const d1 = await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'Dok Belum', urutan: 0 } })
  const d2 = await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'Dok Ditolak', urutan: 1 } })
  await db.dokumenGuru.create({
    data: { periodeId: periode.id, guruId: guru.id, dokumenId: d2.id, status: 'DITOLAK', alasan: 'Buram', fileId: 'f1', namaFile: 'f.pdf', tipe: 'application/pdf', ukuran: 10, diunggahPada: new Date() },
  })

  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')

  const perlu = page.locator('#perlu-tindakan')
  await expect(perlu).toBeVisible()
  const kartu = perlu.locator('.kartu')
  await expect(kartu).toHaveCount(2)
  // Kartu pertama harus DITOLAK
  await expect(kartu.first().getByText('Ditolak', { exact: true })).toBeVisible()
  // Kartu kedua harus BELUM
  await expect(kartu.last().getByText('Belum diunggah', { exact: true })).toBeVisible()
})

test('kelompok sudah sah dikolaps secara bawaan dan terbuka saat diklik', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'SAH' }, { status: 'MENUNGGU' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')

  const details = page.locator('details#sudah-sah')
  await expect(details).toBeVisible()
  // Pastikan details tertutup secara bawaan
  await expect(details).not.toHaveAttribute('open')

  // Klik summary untuk membuka
  await details.locator('summary').click()
  await expect(details).toHaveAttribute('open', '')
  await expect(details.getByText('SAH', { exact: true })).toBeVisible()
})

test('kelompok sudah sah langsung terbuka jika itu satu-satunya kelompok', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [{ status: 'SAH' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')

  const details = page.locator('details#sudah-sah')
  await expect(details).toHaveAttribute('open', '')
})

test('halaman profil menampilkan daftar kolom yang perlu dilengkapi', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [] })
  await db.guru.update({ where: { id: guru.id }, data: { asalSekolah: null, statusPegawai: null, tahunSertifikasi: null } })

  await masuk(page, guru.username)
  await page.goto('/profil')
  await page.waitForLoadState('networkidle')

  const daftar = page.locator('.daftar-kurang')
  await expect(daftar).toBeVisible()
  // Semua tiga kolom harus muncul sebagai tautan
  await expect(daftar.getByRole('link', { name: 'Asal sekolah' })).toBeVisible()
  await expect(daftar.getByRole('link', { name: 'Status kepegawaian' })).toBeVisible()
  await expect(daftar.getByRole('link', { name: 'Tahun sertifikasi' })).toBeVisible()

  // Tautan menuju ke anchor yang sesuai di halaman profil
  await expect(daftar.getByRole('link', { name: 'Asal sekolah' })).toHaveAttribute('href', '/profil#asal-sekolah')
  await expect(daftar.getByRole('link', { name: 'Status kepegawaian' })).toHaveAttribute('href', '/profil#status-pegawai')
  await expect(daftar.getByRole('link', { name: 'Tahun sertifikasi' })).toHaveAttribute('href', '/profil#tahun-sertifikasi')
})

test('input di FormProfil memiliki id yang sesuai dengan anchor di daftar kelengkapan', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [] })
  await db.guru.update({ where: { id: guru.id }, data: { asalSekolah: null, statusPegawai: null, tahunSertifikasi: null } })

  await masuk(page, guru.username)
  await page.goto('/profil')
  await page.waitForLoadState('networkidle')

  await expect(page.locator('#asal-sekolah')).toBeVisible()
  await expect(page.locator('#status-pegawai')).toBeVisible()
  await expect(page.locator('#tahun-sertifikasi')).toBeVisible()
})
