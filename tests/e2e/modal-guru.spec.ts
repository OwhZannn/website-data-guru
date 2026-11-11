import { test, expect } from '@playwright/test'
import { masuk, buatAdmin, siapkan, db } from './bantu'

test.use({ viewport: { width: 1440, height: 900 } })

test('tombol koreksi menetap saat daftar tugas memanjang', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  const tombol = page.getByRole('button', { name: 'Koreksi profil dan tugas' })
  const sebelum = await tombol.boundingBox()
  await db.guru.update({ where: { id: guru.id }, data: { tugasLabPerpus: true, tugasRohis: true, tugasInklusi: true, tugasWakasek: true, tugasOsis: true } })
  await page.reload()
  const sesudah = await tombol.boundingBox()
  const profil = await page.locator('.detail-profil').boundingBox()
  expect(Math.abs(sesudah!.y - sebelum!.y)).toBeLessThan(2)
  expect(sesudah!.x + sesudah!.width).toBeGreaterThan(profil!.x + profil!.width - 40)
})

test('modal koreksi: perubahan baru tersimpan saat tombol simpan ditekan, bukan saat klik atau mengetik', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  await page.getByRole('button', { name: 'Koreksi profil dan tugas' }).click()

  const dialog = page.locator('dialog.modal-profil')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Koreksi Profil dan Tugas Guru' })).toBeVisible()
  await expect(dialog.locator('.combobox-input')).toHaveCount(0)

  const tugas = async () => (await db.guru.findUniqueOrThrow({ where: { id: guru.id } }))
  const namaAwal = (await tugas()).nama

  await dialog.getByLabel('Wali kelas').check({ force: true })
  await dialog.getByLabel(/Guru sertifikasi baru/).check()
  await dialog.locator('input[name="nama"]').fill('Nama Baru, S.Pd.')
  await expect(dialog.getByText('1 dipilih')).toBeVisible()
  await page.waitForTimeout(500)
  expect(await tugas()).toMatchObject({ tugasWaliKelas: false, sertifikasiBaru: false, nama: namaAwal })

  await dialog.getByRole('button', { name: 'Simpan profil' }).click()
  await expect(dialog).not.toBeVisible()
  expect(await tugas()).toMatchObject({ tugasWaliKelas: true, sertifikasiBaru: true, nama: 'Nama Baru, S.Pd.' })
})

test('menutup modal tanpa simpan membuang perubahan', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  const tombol = page.getByRole('button', { name: 'Koreksi profil dan tugas' })
  await tombol.click()
  const dialog = page.locator('dialog.modal-profil')
  await dialog.getByLabel('Wali kelas').check({ force: true })
  await dialog.getByRole('button', { name: 'Tutup modal' }).click()
  await expect(dialog).not.toBeVisible()
  await tombol.click()
  await expect(dialog.getByLabel('Wali kelas')).not.toBeChecked()
  expect((await db.guru.findUniqueOrThrow({ where: { id: guru.id } })).tugasWaliKelas).toBe(false)
})

test('modal tambah dan koreksi memakai tata letak yang sama: kepala, kaki, dan radio sejajar', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}?periode=${periode.id}`)
  await page.getByRole('button', { name: 'Koreksi profil dan tugas' }).click()
  const dialog = page.locator('dialog.modal-profil')
  const ukur = async () => {
    const [k, f, kotak, radio] = await Promise.all([
      dialog.locator('.modal-profil__kepala').boundingBox(),
      dialog.locator('.modal-profil__kaki').boundingBox(),
      dialog.locator('label.centang', { hasText: /^Guru$/ }).boundingBox(),
      dialog.locator('label.centang', { hasText: /^Guru$/ }).locator('input').boundingBox(),
    ])
    expect(Math.abs((radio!.y + radio!.height / 2) - (kotak!.y + kotak!.height / 2))).toBeLessThan(2)
    const kepala = await dialog.locator('.modal-profil__kepala').evaluate((e) => getComputedStyle(e).paddingLeft)
    const kaki = await dialog.locator('.modal-profil__kaki').evaluate((e) => getComputedStyle(e).paddingRight)
    const badan = await dialog.locator('.modal-profil__badan').evaluate((e) => getComputedStyle(e).paddingLeft)
    return { kepala, kaki, badan, tinggiKepala: Math.round(k!.height), tinggiKaki: Math.round(f!.height) }
  }
  const koreksi = await ukur()
  expect(koreksi.kepala).toBe(koreksi.badan)
  expect(koreksi.kaki).toBe(koreksi.badan)
  expect(koreksi.tinggiKepala).toBe(koreksi.tinggiKaki)
  await page.keyboard.press('Escape')

  await page.goto('/admin/guru')
  await page.getByRole('button', { name: 'Tambah guru' }).click()
  await expect(dialog).toBeVisible()
  expect(await ukur()).toEqual(koreksi)
})
