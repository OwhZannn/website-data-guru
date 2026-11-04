import { test, expect } from '@playwright/test'
import { siapkan, masuk } from './bantu'

test('galat Drive ditampilkan apa adanya dari server, tanpa sukses palsu dan tanpa Coba lagi', async ({ page }) => {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.email)
  await expect(page).toHaveURL('/dokumen')
  await page.waitForLoadState('networkidle')
  const PESAN = 'Penyimpanan Google Drive penuh. Hubungi admin.'
  await page.route('**/api/dokumen/unggah', (route) =>
    route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, pesan: PESAN }) }),
  )
  await page.getByTestId(`berkas-${daftar[0].id}`).setInputFiles({
    name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  })
  await expect(page.getByText(PESAN)).toBeVisible()
  await expect(page.getByText('Menunggu diperiksa')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toHaveCount(0)
})
