import { test, expect } from '@playwright/test'
import { db, siapkan, masuk, buatAdmin } from './bantu'

test('guru tanpa profil diminta melengkapinya; setelah itu dokumen sesuai tugas tampil dan bisa diunggah', async ({ page }) => {
  const { guru, periode, daftar } = await siapkan({ dokumen: [{ status: 'BELUM' }] })
  await db.guru.update({ where: { id: guru.id }, data: { asalSekolah: null, statusPegawai: null, tahunSertifikasi: null } })
  const tbq = await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'Laporan TBQ', urutan: 5, berlakuUntuk: 'tbq' } })
  const pangkat = await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'SK kenaikan pangkat terakhir', urutan: 6, berlakuUntuk: 'pns' } })

  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Lengkapi profil Anda dulu.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unggah' })).toHaveCount(0)
  await expect(page.getByText(tbq.nama)).toHaveCount(0)

  await page.getByRole('link', { name: 'Lengkapi profil' }).click()
  await expect(page.getByRole('heading', { name: 'Profil Saya' })).toBeVisible()
  await page.getByLabel('Asal sekolah').fill('MAN 1 Mataram')
  await page.getByLabel('Status kepegawaian').selectOption('PPPK')
  await page.getByLabel('Tahun sertifikasi').fill('2017')
  await expect(page.getByLabel('Jam tambahan TBQ')).toHaveCount(0) // tugas tambahan tidak ada di profil
  await page.getByRole('button', { name: 'Simpan profil' }).click()

  // Profil pertama kali lengkap: langsung kembali ke daftar dokumen.
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Lengkapi profil Anda dulu.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: tbq.nama })).toHaveCount(0)
  await expect(page.getByText('Progres: 0 dari 1 dokumen sah')).toBeVisible()

  // Centang TBQ di halaman dokumen: unggahan Laporan TBQ langsung muncul.
  await page.getByText('Tugas tambahan', { exact: true }).click() // ringkasan terlipat bagi guru
  await page.getByLabel('Jam tambahan TBQ').check()
  await expect(page.getByRole('heading', { name: tbq.nama })).toBeVisible()
  await expect(page.getByText(pangkat.nama)).toHaveCount(0) // PPPK: SK pangkat tidak diminta
  await expect(page.getByText('Progres: 0 dari 2 dokumen sah')).toBeVisible()
  await expect(page.getByTestId(`berkas-${daftar[0].id}`)).toHaveCount(1)

  const g = await db.guru.findUniqueOrThrow({ where: { id: guru.id } })
  expect(g).toMatchObject({ asalSekolah: 'MAN 1 Mataram', statusPegawai: 'PPPK', jabatan: 'GURU', tahunSertifikasi: 2017, tugasTbq: true, tugasRohis: false })

  // Hapus centang: laporan TBQ hilang dari daftar dan dari hitungan.
  await page.getByLabel('Jam tambahan TBQ').uncheck()
  await expect(page.getByRole('heading', { name: tbq.nama })).toHaveCount(0)
  await expect(page.getByText('Progres: 0 dari 1 dokumen sah')).toBeVisible()
})

test('kepala sekolah tidak diminta jadwal dan absen sekolah, melainkan SK dan program kepala sekolah', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [] })
  const buat = (nama: string, urutan: number, berlakuUntuk: string) =>
    db.daftarDokumen.create({ data: { periodeId: periode.id, nama, urutan, berlakuUntuk } })
  await buat('Jadwal dan tugas guru PAI dari sekolah', 1, 'guru')
  await buat('Absen dari sekolah', 2, 'guru')
  await buat('SK sebagai kepala sekolah', 3, 'kepsek')
  await buat('Absen dari aplikasi SIAGA', 4, 'kepsek')
  await buat('SK kenaikan gaji berkala terakhir', 5, 'semua')

  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByRole('heading', { name: 'Absen dari sekolah' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'SK sebagai kepala sekolah' })).toHaveCount(0)

  await page.goto('/profil')
  await page.getByLabel(/^Kepala sekolah/).check()
  await page.getByRole('button', { name: 'Simpan profil' }).click()
  await expect(page.getByText('Profil tersimpan.')).toBeVisible()
  await page.goto('/dokumen')
  await expect(page.getByRole('heading', { name: 'SK sebagai kepala sekolah' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Absen dari aplikasi SIAGA' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'SK kenaikan gaji berkala terakhir' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Absen dari sekolah' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Jadwal dan tugas guru PAI dari sekolah' })).toHaveCount(0)
  await expect(page.getByText('Progres: 0 dari 3 dokumen sah')).toBeVisible()
})

test('semua dokumen wajib sah: guru mendapat perintah unggah ke SIAGA', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'SAH' }, { status: 'SAH' }] })
  // Dokumen khusus Rohis belum diunggah, tapi guru ini bukan pembina Rohis.
  await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'Laporan bimbingan Rohis', urutan: 9, berlakuUntuk: 'rohis' } })

  await masuk(page, guru.username)
  await expect(page).toHaveURL('/dokumen')
  await expect(page.getByText('Berkas Anda sudah lulus verval.')).toBeVisible()
  await expect(page.getByText('Cetak SKMT dan SPTJM dari SIAGA.')).toBeVisible()

  // Begitu tugas Rohis dicentang, dokumen itu jadi wajib dan perintah SIAGA hilang.
  await db.guru.update({ where: { id: guru.id }, data: { tugasRohis: true } })
  await page.reload()
  await expect(page.getByText('Laporan bimbingan Rohis')).toBeVisible()
  await expect(page.getByText('Berkas Anda sudah lulus verval.')).toHaveCount(0)
})

test('admin mengoreksi profil guru, perubahan tercatat, dan status ikut menyesuaikan', async ({ page }) => {
  const { guru, periode } = await siapkan({ dokumen: [{ status: 'SAH' }] })
  await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: 'Buku rekening', urutan: 9, berlakuUntuk: 'sertifikasi_baru' } })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/guru/${guru.id}`)
  await expect(page.getByText('Progres: 1 dari 1 dokumen sah')).toBeVisible()
  await page.getByText('Koreksi profil').click()
  await page.getByLabel(/Guru sertifikasi baru/).check()
  await page.getByRole('button', { name: 'Simpan profil' }).click()
  await expect(page.getByText('Progres: 1 dari 2 dokumen sah')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Buku rekening' })).toBeVisible()
  await expect(page.getByLabel('Riwayat profil')).toContainText('admin: sertifikasi baru: tidak → ya')
})

test('admin mengisi periode kosong dengan daftar dokumen baku', async ({ page }) => {
  const admin = await buatAdmin()
  const p = await db.periode.create({ data: { nama: `Kosong ${Date.now()}` } })
  await masuk(page, admin.email)
  await expect(page).toHaveURL('/admin')
  await page.goto(`/admin/periode/${p.id}/dokumen`)
  await page.getByRole('button', { name: 'Isi dengan daftar baku' }).click()
  await expect(page.getByText('Sertifikat pendidik (asli atau legalisir)')).toBeVisible()
  await expect(page.getByLabel('Berlaku untuk SK kenaikan pangkat terakhir')).toHaveValue(/pns/i)
  await expect(page.getByRole('button', { name: 'Isi dengan daftar baku' })).toHaveCount(0)
  expect(await db.daftarDokumen.count({ where: { periodeId: p.id } })).toBe(24)
})

test('guru dapat mengubah nama lengkap di halaman Profil', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [] })
  await masuk(page, guru.username)
  await page.goto('/profil')

  const namaBaru = `${guru.nama} Al-Bantani, S.Pd.I.`
  await page.locator('input[name="nama"]').fill(namaBaru)
  await page.getByRole('button', { name: 'Simpan profil' }).click()
  await expect(page.locator('.ok')).toContainText('Profil tersimpan.')

  const g = await db.guru.findUniqueOrThrow({ where: { id: guru.id } })
  expect(g.nama).toBe(namaBaru)
})

test('admin dapat mengoreksi nama dan NIP guru, memperbarui username masuk', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()
  const nipBaru = '199501012024011009'

  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)

  await page.getByText('Koreksi profil').click()
  await page.locator('input[name="nama"]').fill('Drs. Guru Terkoreksi')
  await page.locator('input[name="nip"]').fill(nipBaru)
  await page.getByRole('button', { name: 'Simpan profil' }).click()
  await expect(page.locator('dialog.modal-profil')).not.toBeVisible()

  const g = await db.guru.findUniqueOrThrow({ where: { id: guru.id } })
  expect(g.nama).toBe('Drs. Guru Terkoreksi')
  expect(g.nip).toBe(nipBaru)
  expect(g.username).toBe(nipBaru)

  await expect(page.getByLabel('Riwayat profil')).toContainText(`NIP: ${guru.nip} → ${nipBaru}`)
})

test('tombol koreksi profil membuka modal yang bisa ditutup dengan tombol tutup atau Esc', async ({ page }) => {
  const { guru } = await siapkan({ dokumen: [] })
  const admin = await buatAdmin()

  await masuk(page, admin.email)
  await page.goto(`/admin/guru/${guru.id}`)

  const modal = page.locator('dialog.modal-profil')
  await expect(modal).toHaveCount(1)
  await expect(modal).not.toBeVisible()

  // Buka modal
  await page.getByRole('button', { name: 'Koreksi profil dan tugas' }).click()
  await expect(modal).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Koreksi Profil dan Tugas Guru' })).toBeVisible()

  // Tutup dengan tombol Escape
  await page.keyboard.press('Escape')
  await expect(modal).not.toBeVisible()

  // Buka lagi lalu tutup dengan tombol X
  await page.getByRole('button', { name: 'Koreksi profil dan tugas' }).click()
  await expect(modal).toBeVisible()
  await page.getByRole('button', { name: 'Tutup modal' }).click()
  await expect(modal).not.toBeVisible()
})
