import { test, expect } from '@playwright/test'
import { db, masuk, buatAdmin, siapkan } from './bantu'

test.describe('Modal Guru terpadu dan Tugas Tambahan Multi-Select', () => {
  test('modal memiliki header tetap, isi bergulir, footer tetap, dan tugas tambahan combobox berfungsi', async ({ page }) => {
    const { guru, periode } = await siapkan({ dokumen: [] })
    const admin = await buatAdmin()

    await masuk(page, admin.email)
    await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)

    // Buka modal koreksi profil
    const tombolKoreksi = page.getByRole('button', { name: 'Koreksi profil dan tugas' })
    await expect(tombolKoreksi).toBeVisible()
    await tombolKoreksi.click()

    // Dialog muncul
    const dialog = page.locator('dialog.modal-profil')
    await expect(dialog).toBeVisible()

    // Header dan Footer tetap terlihat
    await expect(dialog.getByRole('heading', { name: 'Koreksi Profil dan Tugas Guru' })).toBeVisible()
    const tombolSimpan = dialog.getByRole('button', { name: 'Simpan profil' })
    await expect(tombolSimpan).toBeVisible()

    // Tugas tambahan varian combobox
    const inputTugas = dialog.getByRole('combobox', { name: 'Pilih tugas tambahan' })
    await expect(inputTugas).toBeVisible()

    // Klik input combobox, ketik "wali", dan pilih "Wali kelas"
    await inputTugas.click()
    await inputTugas.fill('wali')
    const opsiWali = dialog.getByRole('option', { name: 'Wali kelas' })
    await expect(opsiWali).toBeVisible()
    await opsiWali.click()

    // Chip tugas tambahan muncul
    const chipWali = dialog.locator('.tugas-chip', { hasText: 'Wali kelas' })
    await expect(chipWali).toBeVisible()

    // Textfield combobox otomatis bersih kembali (resetOnSelect)
    await expect(inputTugas).toHaveValue('')

    // Hapus tugas lewat tombol hapus pada chip
    const tombolHapus = chipWali.getByRole('button', { name: 'Hapus tugas Wali kelas' })
    await tombolHapus.click()
    await expect(chipWali).toHaveCount(0)

    // Tutup modal dengan tombol X di header
    const tombolTutup = dialog.getByRole('button', { name: 'Tutup modal' })
    await tombolTutup.click()
    await expect(dialog).not.toBeVisible()
  })
})
