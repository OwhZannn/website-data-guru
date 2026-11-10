import { test, expect } from '@playwright/test'
import { masuk, siapkan, buatAdmin } from './bantu'
import { PETUNJUK } from '../../src/lib/petunjukIsian'

test.describe('Issue #59 — Hint dan placeholder formulir akun guru dan profil', () => {
  test('formulir daftar (/daftar) memiliki placeholder format contoh dan teks bantuan', async ({ page }) => {
    await page.goto('/daftar')

    // Kolom nama
    const inputNama = page.locator('input[name="nama"]')
    await expect(inputNama).toHaveAttribute('placeholder', PETUNJUK.nama.contoh)
    await expect(page.getByText(PETUNJUK.nama.bantuan)).toBeVisible()

    // Kolom status
    await expect(page.getByText(PETUNJUK.statusPegawai.bantuan)).toBeVisible()

    // Kolom NIP/NIK tidak menggunakan "Pilih status dulu" sebagai placeholder
    const inputNip = page.locator('input[name="nip"]')
    await expect(inputNip).toHaveAttribute('placeholder', PETUNJUK.nip.contoh)
    await expect(inputNip).not.toHaveAttribute('placeholder', /pilih status/i)

    // Bantuan identitas dinamis saat belum memilih vs setelah memilih
    await expect(page.getByText(/Pilih status kepegawaian dulu/i)).toBeVisible()

    await page.selectOption('select[name="statusPegawai"]', 'NON_ASN')
    const inputNik = page.locator('input[name="nik"]')
    await expect(inputNik).toHaveAttribute('placeholder', PETUNJUK.nik.contoh)
    await expect(page.getByText(/Non ASN masuk memakai NIK sebagai username/i)).toBeVisible()

    // Kolom tahun sertifikasi
    const inputTahun = page.locator('input[name="tahunSertifikasi"]')
    await expect(inputTahun).toHaveAttribute('placeholder', PETUNJUK.tahunSertifikasi.contoh)
    await expect(page.getByText(PETUNJUK.tahunSertifikasi.bantuan)).toBeVisible()

    // Kolom asal sekolah menggunakan contoh madrasah
    const inputSekolah = page.locator('input[name="asalSekolah"]')
    await expect(inputSekolah).toHaveAttribute('placeholder', PETUNJUK.asalSekolah.contoh)
    expect(PETUNJUK.asalSekolah.contoh).toContain('MAN')
    await expect(page.getByText(PETUNJUK.asalSekolah.bantuan)).toBeVisible()
  })

  test('formulir tambah guru admin memiliki hint dan placeholder yang seragam', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/admin/guru/tambah')

    await expect(page.locator('input[name="nama"]')).toHaveAttribute('placeholder', PETUNJUK.nama.contoh)
    await expect(page.locator('input[name="asalSekolah"]')).toHaveAttribute('placeholder', PETUNJUK.asalSekolah.contoh)
    await expect(page.locator('input[name="tahunSertifikasi"]')).toHaveAttribute('placeholder', PETUNJUK.tahunSertifikasi.contoh)
  })

  test('formulir profil guru (/profil) memiliki hint dan menampilkan NIP/NIK', async ({ page }) => {
    const { guru } = await siapkan({ dokumen: [] })
    await masuk(page, guru.username)
    await page.goto('/profil')

    // Asal sekolah
    await expect(page.locator('input[name="asalSekolah"]')).toHaveAttribute('placeholder', PETUNJUK.asalSekolah.contoh)
    await expect(page.getByText(PETUNJUK.asalSekolah.bantuan)).toBeVisible()

    // Status kepegawaian dan tahun sertifikasi
    await expect(page.getByText(PETUNJUK.statusPegawai.bantuan)).toBeVisible()
    await expect(page.locator('input[name="tahunSertifikasi"]')).toHaveAttribute('placeholder', PETUNJUK.tahunSertifikasi.contoh)
    await expect(page.getByText(PETUNJUK.tahunSertifikasi.bantuan)).toBeVisible()

    // NIP/NIK read-only dengan bantuan
    await expect(page.getByText(PETUNJUK.nip.bantuan)).toBeVisible()
  })
})
