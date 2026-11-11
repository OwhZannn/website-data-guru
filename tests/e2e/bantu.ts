import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'
import { hashSandi } from '../../src/lib/sandi'

export const db = new PrismaClient({ datasources: { db: { url: 'file:./e2e.db' } } })
export const SANDI = 'sandi-awal-123'

type Isi = { status: string; alasan?: string }

/** Data mandiri per tes: guru, periode, dokumen, dan baris DokumenGuru sesuai keadaan. */
export async function siapkan(opsi: { dibuka?: boolean; dokumen: Isi[] }) {
  const id = randomUUID().slice(0, 8)
  await db.periode.updateMany({ where: { dibuka: true }, data: { dibuka: false } })
  const guru = await db.guru.create({
    data: {
      nama: `Guru ${id}`, username: id, nip: id, email: `${id}@contoh.id`, hashSandi: await hashSandi(SANDI),
      asalSekolah: 'SMA Negeri 1', statusPegawai: 'PNS', tahunSertifikasi: 2015,
    },
  })
  const periode = await db.periode.create({ data: { nama: `Periode ${id}`, dibuka: opsi.dibuka ?? true } })
  const daftar = []
  for (const [i, d] of opsi.dokumen.entries()) {
    const dok = await db.daftarDokumen.create({ data: { periodeId: periode.id, nama: `Dokumen ${id}-${i + 1}`, urutan: i } })
    daftar.push(dok)
    if (d.status !== 'BELUM') {
      await db.dokumenGuru.create({
        data: {
          periodeId: periode.id, guruId: guru.id, dokumenId: dok.id, status: d.status, alasan: d.alasan ?? null,
          fileId: 'palsu-1', namaFile: 'lama.pdf', tipe: 'application/pdf', ukuran: 10, diunggahPada: new Date(),
        },
      })
    }
  }
  return { guru, periode, daftar }
}

/** Tombol kirim baru aktif setelah hidrasi; menunggu itu mencegah pengiriman formulir asli sebelum JS siap. */
/** `email` untuk admin, NIP/NIK (username) untuk guru. */
export async function masuk(page: Page, email: string, sandi = SANDI) {
  try {
    await page.goto('/masuk')
  } catch {
    await page.waitForTimeout(500)
    await page.goto('/masuk')
  }
  const tombol = page.locator('button[type=submit]')
  await expect(tombol).toBeEnabled({ timeout: process.env.CI ? 20_000 : 10_000 })
  await page.fill('[name=username]', email)
  await page.fill('[name=sandi]', sandi)
  await tombol.click()
  // Tunggu navigasi selesai; bisa ke /admin (admin), /dokumen (guru), atau tetap di /masuk (gagal).
  await page.waitForURL((url) => !url.pathname.startsWith('/masuk'), { timeout: process.env.CI ? 20_000 : 10_000 }).catch(() => {})
}

export const pdf = () => ({ name: 'baru.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%test\n') })

export async function buatAdmin() {
  const id = randomUUID().slice(0, 8)
  return db.admin.create({ data: { nama: `Admin ${id}`, email: `admin-${id}@contoh.id`, hashSandi: await hashSandi(SANDI) } })
}

/** Tombol dirender server; klik sebelum hidrasi tak berefek, jadi diulang sampai menu terbuka. */
export async function bukaMenu(page: Page) {
  const menu = page.getByRole('menu', { name: 'Menu akun' })
  await expect(async () => {
    if (!(await menu.isVisible())) await page.getByRole('button', { name: /^Menu akun/ }).click()
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
}
