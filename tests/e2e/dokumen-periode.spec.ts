import { test, expect } from '@playwright/test'
import { siapkan, masuk, db, buatAdmin } from './bantu'

test('menambah dokumen saat guru lengkap menampilkan peringatan, lalu guru jadi belum lengkap', async ({ page, context }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'SAH' }, { status: 'SAH' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/periode/${periode.id}/dokumen`)
  await page.waitForLoadState('networkidle')

  await page.getByLabel('Nama dokumen baru').fill('Kartu Pegawai')
  await page.getByRole('button', { name: 'Tambah dokumen' }).click()
  await expect(page.getByText('Menambah dokumen ini akan membuat 1 guru yang sudah lengkap kembali berstatus belum lengkap. Lanjutkan?')).toBeVisible()
  expect(await db.daftarDokumen.count({ where: { periodeId: periode.id } })).toBe(2)

  await page.getByRole('button', { name: 'Lanjutkan' }).click()
  await expect(page.getByRole('row', { name: 'Kartu Pegawai' })).toBeVisible()
  expect(await db.daftarDokumen.count({ where: { periodeId: periode.id } })).toBe(3)

  await context.clearCookies()
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Progres: 2 dari 3 dokumen sah')).toBeVisible()
  await expect(page.getByText('Kartu Pegawai')).toBeVisible()
})

test('batal pada peringatan tidak menambah dokumen', async ({ page }) => {
  const { periode } = await siapkan({ dokumen: [{ status: 'SAH' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/periode/${periode.id}/dokumen`)
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Nama dokumen baru').fill('Tidak Jadi')
  await page.getByRole('button', { name: 'Tambah dokumen' }).click()
  await page.getByRole('button', { name: 'Batal', exact: true }).click()
  expect(await db.daftarDokumen.count({ where: { periodeId: periode.id } })).toBe(1)
})

test('menonaktifkan dokumen menghilangkannya dari /dokumen guru, dan bisa diaktifkan kembali', async ({ page, context }) => {
  const { guru, periode, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }, { status: 'BELUM' }] })
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/periode/${periode.id}/dokumen`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/disembunyikan dari guru, bukan dihapus/).first()).toBeVisible()
  await page.getByRole('row', { name: daftar[0].nama }).getByRole('button', { name: 'Nonaktifkan' }).click()
  await expect(page.getByRole('heading', { name: 'Dokumen nonaktif' })).toBeVisible()

  await context.clearCookies()
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText(daftar[1].nama)).toBeVisible()
  await expect(page.getByText(daftar[0].nama)).toHaveCount(0)

  await context.clearCookies()
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/periode/${periode.id}/dokumen`)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Aktifkan kembali' }).click()
  await expect(page.getByRole('heading', { name: 'Dokumen nonaktif' })).toHaveCount(0)
  expect((await db.daftarDokumen.findUnique({ where: { id: daftar[0].id } }))?.aktif).toBe(true)
})
