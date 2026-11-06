import { test, expect, type Page } from '@playwright/test'
import { siapkan, masuk } from './bantu'

/** Membuat JPEG noise di peramban lewat canvas (tanpa berkas biner di repo). */
async function jpegBesar(page: Page, lebar: number, tinggi: number, mutu: number): Promise<Buffer> {
  const b64 = await page.evaluate(async ([w, h, q]) => {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d')!
    const d = ctx.createImageData(w, h)
    for (let i = 0; i < d.data.length; i += 4) {
      d.data[i] = Math.random() * 256; d.data[i + 1] = Math.random() * 256; d.data[i + 2] = Math.random() * 256; d.data[i + 3] = 255
    }
    ctx.putImageData(d, 0, 0)
    const blob: Blob = await new Promise((r) => c.toBlob((x) => r(x!), 'image/jpeg', q))
    const bytes = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return btoa(s)
  }, [lebar, tinggi, mutu] as const)
  return Buffer.from(b64, 'base64')
}

async function siapUnggah(page: Page) {
  const { guru, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await page.waitForLoadState('networkidle')
  const dikirim: { ukuran: number; badan: Buffer }[] = []
  await page.route('**/api/dokumen/unggah', async (route) => {
    const badan = route.request().postDataBuffer() ?? Buffer.alloc(0)
    dikirim.push({ ukuran: badan.length, badan })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })
  return { input: page.getByTestId(`berkas-${daftar[0].id}`), dikirim }
}

test('foto besar dikecilkan sebelum dikirim', async ({ page }) => {
  const { input, dikirim } = await siapUnggah(page)
  const asli = await jpegBesar(page, 4000, 3000, 0.9)
  expect(asli.length).toBeGreaterThan(5 * 1024 * 1024)
  await input.setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: asli })
  await expect.poll(() => dikirim.length).toBe(1)
  expect(dikirim[0].ukuran).toBeLessThan(3 * 1024 * 1024)
})

test('PDF dikirim tanpa diubah', async ({ page }) => {
  const { input, dikirim } = await siapUnggah(page)
  const isi = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1024 * 1024, 0x41), Buffer.from('\n%%EOF\n')])
  await input.setInputFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: isi })
  await expect.poll(() => dikirim.length).toBe(1)
  expect(dikirim[0].badan.includes(isi)).toBe(true)
})

test('JPEG kecil dikirim tanpa diubah', async ({ page }) => {
  const { input, dikirim } = await siapUnggah(page)
  const kecil = await jpegBesar(page, 160, 120, 0.3)
  expect(kecil.length).toBeLessThan(200 * 1024)
  await input.setInputFiles({ name: 'kecil.jpg', mimeType: 'image/jpeg', buffer: kecil })
  await expect.poll(() => dikirim.length).toBe(1)
  expect(dikirim[0].badan.includes(kecil)).toBe(true)
})

test('bila createImageBitmap gagal, berkas asli tetap dikirim', async ({ page }) => {
  await page.addInitScript(() => {
    window.createImageBitmap = () => Promise.reject(new Error('dipaksa gagal'))
  })
  const { input, dikirim } = await siapUnggah(page)
  const isi = await jpegBesar(page, 800, 600, 0.9)
  expect(isi.length).toBeLessThan(5 * 1024 * 1024)
  await input.setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: isi })
  await expect.poll(() => dikirim.length).toBe(1)
  expect(dikirim[0].badan.includes(isi)).toBe(true)
})
