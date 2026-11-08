import { test, expect } from '@playwright/test'
import { siapkan, masuk, buatAdmin, db } from './bantu'

test('urut nama desc menampilkan guru berurutan terbalik', async ({ page }) => {
  const admin = await buatAdmin()
  const prefix = `Fase4${admin.id.slice(0, 4)}`

  // Buat 3 guru dengan nama terurut
  await db.guru.createMany({
    data: [
      { nama: `${prefix} Andi`, username: `${prefix}andi`, nip: `${prefix}andi`, email: `${prefix}andi@test.id`, hashSandi: 'x' },
      { nama: `${prefix} Budi`, username: `${prefix}budi`, nip: `${prefix}budi`, email: `${prefix}budi@test.id`, hashSandi: 'x' },
      { nama: `${prefix} Citra`, username: `${prefix}citra`, nip: `${prefix}citra`, email: `${prefix}citra@test.id`, hashSandi: 'x' },
    ],
  })

  await masuk(page, admin.email)
  await page.goto(`/admin/guru?q=${prefix}&urut=nama&arah=desc`)

  // Citra harus muncul sebelum Budi, Budi sebelum Andi
  const tautan = page.getByRole('link', { name: new RegExp(`${prefix}`) })
  const jumlah = await tautan.count()
  expect(jumlah).toBeGreaterThanOrEqual(3)

  // Ambil posisi relatif: Citra lebih atas dari Andi
  const idxCitra = await page.evaluate((prefix: string) => {
    const links = [...document.querySelectorAll('a')]
    return links.findIndex(a => a.textContent?.includes(prefix + ' Citra'))
  }, prefix)
  const idxAndi = await page.evaluate((prefix: string) => {
    const links = [...document.querySelectorAll('a')]
    return links.findIndex(a => a.textContent?.includes(prefix + ' Andi'))
  }, prefix)
  expect(idxCitra).toBeGreaterThan(-1)
  expect(idxAndi).toBeGreaterThan(-1)
  expect(idxCitra).toBeLessThan(idxAndi)

  // URL harus menyertakan urut=nama&arah=desc
  await expect(page).toHaveURL(/urut=nama/)
  await expect(page).toHaveURL(/arah=desc/)
  // Tajuk kolom Nama harus memiliki aria-sort=descending (elemen ada di DOM meskipun thead tersembunyi di ponsel)
  await expect(page.locator('th[aria-sort="descending"]')).toHaveCount(1)
})

test('filter gabungan status + sekolah dipertahankan saat berganti halaman', async ({ page }) => {
  const admin = await buatAdmin()
  const prefix = `Fase4F${admin.id.slice(0, 4)}`
  const sekolah = `SD Fase4 ${admin.id.slice(0, 4)}`

  // Buat 25 guru dari sekolah yang sama, semua disetujui
  await db.guru.createMany({
    data: Array.from({ length: 25 }, (_, i) => {
      const n = String(i + 1).padStart(2, '0')
      return {
        nama: `${prefix} ${n}`,
        username: `${prefix}u${n}`,
        nip: `${prefix}n${n}`,
        email: `${prefix}${n}@test.id`,
        hashSandi: 'x',
        asalSekolah: sekolah,
        disetujui: true,
      }
    }),
  })
  // Satu guru dari sekolah berbeda (tidak boleh muncul)
  await db.guru.create({
    data: {
      nama: `${prefix} Lain`,
      username: `${prefix}lain`,
      nip: `${prefix}lain`,
      email: `${prefix}lain@test.id`,
      hashSandi: 'x',
      asalSekolah: 'Sekolah Berbeda',
    },
  })

  await masuk(page, admin.email)
  // Navigasi dengan filter status=semua + asalSekolah + per=20
  await page.goto(`/admin/guru?q=${prefix}&asalSekolah=${encodeURIComponent(sekolah)}&per=20`)

  // Halaman 1: 20 dari 25
  await expect(page.getByText(`Menampilkan 1–20 dari 25 guru`)).toBeVisible()

  // Klik ke halaman 2
  await page.getByRole('navigation', { name: 'Halaman daftar guru' }).getByRole('link', { name: '2' }).click()

  // Harus ada 25 total dan sekolah lain tidak muncul
  await expect(page.getByText(`Menampilkan 21–25 dari 25 guru`)).toBeVisible()

  // URL masih menyertakan asalSekolah
  await expect(page).toHaveURL(new RegExp(`asalSekolah=`))

  // Guru dari sekolah berbeda tidak muncul
  await expect(page.getByRole('link', { name: `${prefix} Lain` })).toHaveCount(0)
})

test('EmptyState muncul bila tidak ada guru yang cocok', async ({ page }) => {
  const admin = await buatAdmin()
  await masuk(page, admin.email)
  await page.goto('/admin/guru?q=tidakAdaGuruDenganNamaIni12345')
  await expect(page.getByText('Tidak ada guru yang cocok.')).toBeVisible()
})
