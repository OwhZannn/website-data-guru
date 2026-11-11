import { test, expect, type Page } from '@playwright/test'
import { db, masuk, buatAdmin, SANDI } from './bantu'
import { hashSandi } from '../../src/lib/sandi'

// Tata letak ringkas (#34): halaman admin utama harus muat satu layar di 1440×900 dengan data contoh.
test.use({ viewport: { width: 1440, height: 900 } })

/** Isi data contoh: 12 guru dengan status beragam, 5 dokumen, satu periode dibuka. */
async function isiData() {
  await db.riwayat.deleteMany()
  await db.dokumenGuru.deleteMany()
  await db.daftarDokumen.deleteMany()
  await db.periode.deleteMany()
  await db.sesi.deleteMany()
  await db.percobaanMasuk.deleteMany()
  await db.guru.deleteMany()
  await db.admin.deleteMany()
  await db.alasanTolak.deleteMany()

  const hash = await hashSandi(SANDI)
  const periode = await db.periode.create({ data: { nama: 'Semester Ganjil 2026', dibuka: true } })
  const dok = []
  for (const [i, n] of ['SK Pembagian Tugas', 'Ijazah Terakhir', 'Sertifikat Pendidik', 'Daftar Hadir', 'Surat Pernyataan'].entries()) {
    dok.push(await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: n, urutan: i } }))
  }
  for (const t of ['File tidak terbaca', 'Bukan dokumen yang diminta', 'Sudah kedaluwarsa']) {
    await db.alasanTolak.create({ data: { teks: t } })
  }
  const sekolah = ['MAN 1 Contoh', 'MTs Negeri 2 Contoh', 'MIN 3 Contoh', 'MAN 2 Contoh']
  const status = ['SAH', 'MENUNGGU', 'DITOLAK'] as const
  let pertama = ''
  for (let i = 0; i < 12; i++) {
    const g = await db.guru.create({
      data: {
        nama: `Guru Contoh ${String(i + 1).padStart(2, '0')}`, username: `19900101${String(i).padStart(10, '0')}`,
        nip: `19900101${String(i).padStart(10, '0')}`, hashSandi: hash,
        asalSekolah: sekolah[i % sekolah.length], statusPegawai: 'PNS', tahunSertifikasi: 2015,
      },
    })
    if (i === 1) pertama = g.id
    if (i % 4 === 3) continue // belum mulai
    for (const [j, d] of dok.entries()) {
      if ((i + j) % 5 === 4) continue
      const st = status[(i + j) % 3]
      await db.dokumenGuru.create({
        data: {
          periodeId: periode.id, guruId: g.id, dokumenId: d.id, status: st,
          alasan: st === 'DITOLAK' ? 'File tidak terbaca' : null,
          fileId: `palsu-${i}-${j}`, namaFile: `berkas-${j}.pdf`, tipe: 'application/pdf', ukuran: 10,
          diunggahPada: new Date(Date.now() - (i * 5 + j) * 3600_000),
        },
      })
    }
  }
  return { guruId: pertama }
}

async function tinggi(page: Page) {
  await page.waitForLoadState('networkidle')
  return page.evaluate(() => ({
    dokumen: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }))
}

test.describe('halaman admin muat satu layar di 1440×900', () => {
  let guruId = ''
  let email = ''

  test.beforeAll(async () => {
    ;({ guruId } = await isiData())
    email = (await buatAdmin()).email
  })

  for (const [nama, jalur] of [
    ['Beranda', () => '/admin'],
    ['Guru', () => '/admin/guru'],
    ['Antrean', () => '/admin/antrean'],
    ['Detail guru', () => `/admin/guru/${guruId}`],
  ] as const) {
    test(`${nama} tanpa gulir halaman`, async ({ page }) => {
      await masuk(page, email)
      await page.goto(jalur())
      const t = await tinggi(page)
      expect(t.dokumen, `${nama}: tinggi dokumen ${t.dokumen}px melebihi layar ${t.viewport}px`).toBeLessThanOrEqual(t.viewport + 1)
    })
  }

  test('Dokumen guru tanpa gulir halaman', async ({ page }) => {
    const g = await db.guru.findFirstOrThrow()
    await masuk(page, g.username)
    await page.goto('/dokumen')
    const t = await tinggi(page)
    expect(t.dokumen, `Dokumen guru: tinggi dokumen ${t.dokumen}px melebihi layar ${t.viewport}px`).toBeLessThanOrEqual(t.viewport + 1)
  })
})
