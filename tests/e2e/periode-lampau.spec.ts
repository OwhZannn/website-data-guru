import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db, siapkan, masuk } from './bantu'

test('guru melihat alasan penolakan di periode lampau (hanya baca); id periode asing jatuh ke bawaan', async ({ page }) => {
  const lama = await siapkan({ dibuka: false, dokumen: [{ status: 'DITOLAK', alasan: 'Stempel buram' }] })
  await db.riwayat.create({
    data: { periodeId: lama.periode.id, guruId: lama.guru.id, dokumenId: lama.daftar[0].id, aksi: 'tolak', alasan: 'Stempel buram', oleh: 'x', olehTipe: 'admin' },
  })
  const baru = await db.periode.create({ data: { nama: `Periode baru ${randomUUID().slice(0, 8)}`, dibuka: true } })
  await db.daftarDokumen.create({ data: { periodeId: baru.id, nama: 'Dokumen periode baru', urutan: 0 } })
  // Periode milik guru lain tidak boleh tampil.
  const asing = await siapkan({ dibuka: false, dokumen: [{ status: 'DITOLAK', alasan: 'Rahasia guru lain' }] })
  await db.periode.update({ where: { id: baru.id }, data: { dibuka: true } })

  await masuk(page, lama.guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText(baru.nama, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unggah' })).toBeVisible()
  await expect(page.getByRole('option', { name: asing.periode.nama })).toHaveCount(0)

  // Tanpa tombol: mengganti pilihan langsung memuat periode itu.
  await expect(page.getByRole('button', { name: 'Tampilkan' })).toHaveCount(0)
  await expect(page.locator('form[data-siap] [aria-label="Pilih periode"]')).toBeVisible() // menunggu hidrasi
  await page.getByLabel('Pilih periode').selectOption(lama.periode.id)
  await expect(page).toHaveURL(`/dokumen?periode=${lama.periode.id}`)
  await expect(page.getByText('Alasan penolakan: Stempel buram')).toBeVisible()
  await expect(page.getByRole('list', { name: `Riwayat ${lama.daftar[0].nama}` })).toContainText('Stempel buram')
  await expect(page.getByText('Periode ini sudah ditutup; hanya dapat dilihat.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Unggah/ })).toHaveCount(0)

  await page.goto(`/dokumen?periode=${asing.periode.id}`)
  await expect(page.getByText(baru.nama, { exact: true })).toBeVisible()
  await expect(page.getByText('Rahasia guru lain')).toHaveCount(0)
})
