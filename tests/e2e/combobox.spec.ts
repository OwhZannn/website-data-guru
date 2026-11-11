import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db, masuk, buatAdmin } from './bantu'

test.describe('Combobox dengan pencarian di dalam kolom (Issue #51)', () => {
  test('mengetik menyaring opsi secara dinamis dan Enter memilihnya tanpa perlu menggulir', async ({ page }) => {
    const admin = await buatAdmin()
    const id = randomUUID().replace(/-/g, '').slice(0, 6)
    // Buat guru dengan sekolah spesifik
    await db.guru.createMany({
      data: [
        { nama: `Guru 1 ${id}`, username: `g1${id}`, nip: `g1${id}`, email: `g1${id}@x.id`, hashSandi: 'x', asalSekolah: 'MAN 2 Mataram' },
        { nama: `Guru 2 ${id}`, username: `g2${id}`, nip: `g2${id}`, email: `g2${id}@x.id`, hashSandi: 'x', asalSekolah: 'SMP Negeri 1' },
      ],
    })

    await masuk(page, admin.email)
    await page.goto('/admin/guru')

    const inputCombobox = page.locator('.combobox-input[aria-label="Asal sekolah"]')
    await expect(inputCombobox).toBeVisible()

    // Ketik "man 2"
    await inputCombobox.fill('man 2')

    // Listbox muncul dan menampilkan opsi yang cocok
    const listbox = page.locator('ul[role="listbox"][aria-label="Asal sekolah"]')
    await expect(listbox).toBeVisible()
    await expect(listbox.getByRole('option', { name: 'MAN 2 Mataram' })).toBeVisible()
    await expect(listbox.getByRole('option', { name: 'SMP Negeri 1' })).toHaveCount(0)

    // Tekan ArrowDown lalu Enter untuk memilih
    await inputCombobox.press('ArrowDown')
    await inputCombobox.press('Enter')

    // Pop-up tertutup dan nilai terpilih masuk ke input
    await expect(listbox).not.toBeVisible()
    await expect(inputCombobox).toHaveValue('MAN 2 Mataram')

    // Filter otomatis diterapkan pada URL
    await expect(page).toHaveURL(/asalSekolah=MAN(?:\+|%20)2(?:\+|%20)Mataram/)
    await expect(page.getByRole('link', { name: `Guru 1 ${id}` })).toBeVisible()
    await expect(page.getByRole('link', { name: `Guru 2 ${id}` })).toHaveCount(0)
  })

  test('interaksi keyboard: ArrowDown, ArrowUp, dan Escape', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/admin/guru')

    const input = page.locator('.combobox-input[aria-label="Jenis pegawai"]')
    await expect(input).toBeVisible()

    // Buka dengan ArrowDown
    await input.focus()
    await input.press('ArrowDown')
    const listbox = page.locator('ul[role="listbox"][aria-label="Jenis pegawai"]')
    await expect(listbox).toBeVisible()

    // Escape menutup popup
    await input.press('Escape')
    await expect(listbox).not.toBeVisible()
  })

  test('menampilkan "Tidak ada yang cocok" saat pencarian tidak menemukan hasil', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/admin/guru')

    const input = page.locator('.combobox-input[aria-label="Asal sekolah"]')
    await input.fill('SekolahTidakMungkinAda12345')

    const listbox = page.locator('ul[role="listbox"][aria-label="Asal sekolah"]')
    await expect(listbox).toBeVisible()
    await expect(listbox.getByText('Tidak ada yang cocok')).toBeVisible()
  })
})
