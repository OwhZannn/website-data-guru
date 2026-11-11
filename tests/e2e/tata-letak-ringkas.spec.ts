import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { db, siapkan, masuk, buatAdmin, SANDI } from './bantu'

// Fase 8: tata letak ringkas — kartu tabel mengisi layar, satu pemilih periode, filter yang langsung berlaku.

test.describe('layar lebar 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('daftar guru: halaman tidak menggulir, header satu baris, tabel menggulir di dalam kartu dengan tajuk tetap', async ({ page }) => {
    const admin = await buatAdmin()
    const idAwal = randomUUID().replace(/-/g, '').slice(0, 8)
    const awal = `Ringkas${idAwal}`
    await db.guru.createMany({
      data: Array.from({ length: 30 }, (_, i) => {
        const n = String(i + 1).padStart(2, '0')
        return { nama: `${awal} ${n}`, username: `r${idAwal}${n}`, nip: `r${idAwal}${n}`, email: `r${n}${idAwal}@contoh.id`, hashSandi: 'x' }
      }),
    })
    await masuk(page, admin.email)
    await page.goto(`/admin/guru?q=${awal}&per=50`)
    await expect(page.getByText('Menampilkan 1–30 dari 30 guru')).toBeVisible()

    const ukur = await page.evaluate(() => {
      const kotak = (s: string) => document.querySelector(s)!.getBoundingClientRect()
      const gulir = document.querySelector('.dt__gulir')!
      return {
        dokumen: document.documentElement.scrollHeight, viewport: innerHeight,
        header: kotak('.ph').height, judul: kotak('.ph h1').top, cari: kotak('.ph__cari').top, aksi: kotak('.ph__aksi').top,
        gulirIsi: gulir.scrollHeight, gulirTampak: gulir.clientHeight,
        teksTajuk: getComputedStyle(document.querySelector('.dt th')!).textTransform,
        ukuranIsi: parseFloat(getComputedStyle(document.querySelector('.dt td')!).fontSize),
        barisTinggi: kotak('.dt tbody tr').height,
      }
    })
    expect(ukur.dokumen).toBeLessThanOrEqual(ukur.viewport)
    expect(ukur.header).toBeLessThanOrEqual(56)
    expect(Math.abs(ukur.cari - ukur.judul)).toBeLessThan(16) // satu baris
    expect(Math.abs(ukur.aksi - ukur.judul)).toBeLessThan(16)
    expect(ukur.gulirIsi).toBeGreaterThan(ukur.gulirTampak) // isi menggulir di dalam kartu
    expect(ukur.teksTajuk).toBe('none')
    expect(ukur.ukuranIsi).toBeGreaterThanOrEqual(13)
    expect(ukur.ukuranIsi).toBeLessThanOrEqual(14)
    expect(ukur.barisTinggi).toBeGreaterThanOrEqual(48)
    expect(ukur.barisTinggi).toBeLessThanOrEqual(56)

    // Gulir dalam kartu: tajuk tetap terlihat.
    await page.locator('.dt__gulir').evaluate((e) => { e.scrollTop = e.scrollHeight })
    await expect(page.getByRole('columnheader', { name: 'Nama' })).toBeInViewport()
    await expect(page.getByText('Menampilkan 1–30 dari 30 guru')).toBeInViewport()
    expect(await page.evaluate(() => scrollY)).toBe(0)
  })

  test('tidak ada judul ganda dan pencarian punya label aksesibel', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/admin/guru')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { name: /^Daftar guru/ })).toHaveCount(0)
    const cari = page.getByRole('searchbox', { name: 'Cari nama atau NIP' })
    await cari.focus()
    await expect(cari).toBeFocused()
  })

  test('antrean: halaman tidak menggulir dan kosong ditampilkan di dalam kartu', async ({ page }) => {
    await siapkan({ dokumen: [{ status: 'MENUNGGU' }] })
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/admin/antrean')
    await expect(page.getByRole('heading', { level: 1, name: 'Antrean pemeriksaan' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)

    await page.goto('/admin/antrean?q=tidak-ada-yang-cocok-12345')
    await expect(page.locator('.dt').getByText('Tidak ada dokumen yang cocok dengan filter.')).toBeVisible()
    await expect(page.getByText('Menampilkan 0 dari 0 dokumen')).toBeVisible()
  })

  test('pemilih periode di header langsung berlaku, filter tetap, halaman dan jenis dokumen dibuang', async ({ page }) => {
    const lama = await siapkan({ dibuka: false, dokumen: [{ status: 'MENUNGGU' }] })
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto(`/admin/guru?q=xyz&status=lengkap&per=50&hal=1`)
    await expect(page.getByRole('button', { name: 'Tampilkan' })).toHaveCount(0)
    await expect(page.getByLabel('Pilih periode')).toHaveCount(1) // hanya satu pemilih
    await expect(page.locator('form[data-siap] [aria-label="Pilih periode"]')).toBeVisible() // menunggu hidrasi
    await page.getByLabel('Pilih periode').selectOption(lama.periode.id)
    await expect(page).toHaveURL(new RegExp(`periode=${lama.periode.id}`))
    await expect(page).toHaveURL(/q=xyz/)
    await expect(page).toHaveURL(/status=lengkap/)
    await expect(page).toHaveURL(/per=50/)
    await expect(page).not.toHaveURL(/hal=/)
  })

  test('filter langsung: select dan chip menerapkan tanpa tombol; pencarian menunggu jeda sebelum satu permintaan', async ({ page }) => {
    const admin = await buatAdmin()
    const idSaring = randomUUID().replace(/-/g, '').slice(0, 8)
    const awal = `Saring${idSaring}`
    await db.guru.createMany({
      data: [
        { nama: `${awal} Andi`, username: `s${idSaring}a`, nip: `s${idSaring}a`, email: `sa${idSaring}@contoh.id`, hashSandi: 'x', asalSekolah: `SD ${awal} A` },
        { nama: `${awal} Budi`, username: `s${idSaring}b`, nip: `s${idSaring}b`, email: `sb${idSaring}@contoh.id`, hashSandi: 'x', asalSekolah: `SD ${awal} B` },
      ],
    })
    await masuk(page, admin.email)
    await page.goto(`/admin/guru?q=${awal}`)
    await expect(page.getByRole('button', { name: /Terapkan|Saring/ })).toHaveCount(0)
    await expect(page.locator('form[data-siap] select[name=asalSekolah]')).toBeVisible()

    // Select langsung menyaring.
    await page.locator('form[data-siap] select[name=asalSekolah]').selectOption(`SD ${awal} A`)
    await expect(page).toHaveURL(/asalSekolah=/)
    await expect(page.getByRole('link', { name: `${awal} Andi` })).toBeVisible()
    await expect(page.getByRole('link', { name: `${awal} Budi` })).toHaveCount(0)

    // Chip: tautan dengan aria-current pada yang aktif, bisa dioperasikan papan ketik.
    await expect(page.getByRole('group', { name: 'Filter status' }).getByRole('link', { name: 'Semua' })).toHaveAttribute('aria-current', 'true')
    await page.getByRole('group', { name: 'Filter status' }).getByRole('link', { name: 'Lengkap' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/status=lengkap/)
    await expect(page.getByRole('group', { name: 'Filter status' }).getByRole('link', { name: 'Lengkap' })).toHaveAttribute('aria-current', 'true')

    // Pencarian: banyak ketukan cepat → satu permintaan setelah jeda ~300ms.
    await page.goto(`/admin/guru?per=20`)
    await expect(page.locator('form[data-siap] select[name=asalSekolah]')).toBeVisible()
    const permintaan: string[] = []
    page.on('request', (r) => { if (/\/admin\/guru\?/.test(r.url()) && /[?&]q=/.test(r.url())) permintaan.push(r.url()) })
    const cari = page.getByRole('searchbox', { name: 'Cari nama atau NIP' })
    await cari.click()
    await cari.pressSequentially(`${awal} Bu`, { delay: 40 })
    await expect(page.getByRole('link', { name: `${awal} Budi` })).toBeVisible()
    await expect(page.getByRole('link', { name: `${awal} Andi` })).toHaveCount(0)
    await expect(cari).toBeFocused() // fokus tidak hilang
    await expect(cari).toHaveValue(`${awal} Bu`)
    expect(permintaan).toHaveLength(1)
  })
})

test('tanpa JavaScript: HTML memuat formulir GET dengan tombol <noscript>, dan alamat hasilnya menyaring di server', async ({ request }) => {
  const lama = await siapkan({ dibuka: false, dokumen: [{ status: 'MENUNGGU' }] })
  const admin = await buatAdmin()
  const awal = `TanpaJs${admin.id.slice(0, 5)}`
  await db.guru.createMany({
    data: [
      { nama: `${awal} Cici`, username: `j${admin.id.slice(0, 5)}c`, nip: `j${admin.id.slice(0, 5)}c`, email: `jc${admin.id.slice(0, 5)}@contoh.id`, hashSandi: 'x' },
      { nama: `Lain ${awal}`, username: `j${admin.id.slice(0, 5)}d`, nip: `j${admin.id.slice(0, 5)}d`, email: `jd${admin.id.slice(0, 5)}@contoh.id`, hashSandi: 'x' },
    ],
  })
  // Fallback tanpa JavaScript diperiksa pada HTML yang dikirim server (permintaan langsung), bukan lewat peramban.
  const masukApi = await request.post('/api/auth/masuk', { data: { email: admin.email, sandi: SANDI } })
  expect(masukApi.ok()).toBe(true)
  const html = await (await request.get(`/admin/guru?q=${awal}%20C&per=100`)).text()
  expect(html).toMatch(/<form[^>]*method="get"[^>]*>/)
  expect(html).toContain('<noscript><button type="submit" class="tombol-sm">Saring</button></noscript>')
  expect(html).toContain('<noscript><button type="submit" class="tombol-sm">Ganti</button></noscript>')
  expect(html).toContain('type="search"')
  expect(html).toContain(`${awal} Cici`)
  expect(html).not.toContain(`Lain ${awal}`)

  const lain = await (await request.get(`/admin/guru?periode=${lama.periode.id}&q=${awal}&per=100`)).text()
  expect(lain).toContain(`${awal} Cici`)
  expect(lain).toContain(`Lain ${awal}`)
})

test.describe('ponsel 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('daftar guru menjadi kartu bertumpuk tanpa gulir horizontal; pencarian turun penuh lebar', async ({ page }) => {
    const admin = await buatAdmin()
    await masuk(page, admin.email)
    await page.goto('/admin/guru')
    await expect(page.locator('.dt tbody tr').first()).toBeVisible()
    const ukur = await page.evaluate(() => ({
      lebarDokumen: document.documentElement.scrollWidth, viewport: innerWidth,
      tajukTampak: getComputedStyle(document.querySelector('.dt thead')!).display !== 'none',
      cari: document.querySelector('.ph__cari')!.getBoundingClientRect().width,
      tombol: Math.min(...[...document.querySelectorAll('.ph__aksi > *, .ph__cari input')].map((e) => e.getBoundingClientRect().height)),
    }))
    expect(ukur.lebarDokumen).toBeLessThanOrEqual(ukur.viewport)
    expect(ukur.tajukTampak).toBe(false)
    expect(ukur.cari).toBeGreaterThan(300)
    expect(Math.round(ukur.tombol)).toBeGreaterThanOrEqual(44) // target sentuh utama
  })
})
