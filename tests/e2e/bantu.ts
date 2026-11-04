import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { hashSandi } from '../../src/lib/sandi'

export const db = new PrismaClient({ datasources: { db: { url: 'file:./e2e.db' } } })
export const SANDI = 'sandi-awal-123'

type Isi = { status: string; alasan?: string }

/** Data mandiri per tes: guru, periode, dokumen, dan baris DokumenGuru sesuai keadaan. */
export async function siapkan(opsi: { dibuka?: boolean; dokumen: Isi[] }) {
  const id = randomUUID().slice(0, 8)
  await db.periode.updateMany({ where: { dibuka: true }, data: { dibuka: false } })
  const guru = await db.guru.create({
    data: { nama: `Guru ${id}`, nip: id, email: `${id}@contoh.id`, hashSandi: await hashSandi(SANDI) },
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

export async function masuk(page: Page, email: string) {
  await page.goto('/masuk')
  await page.fill('[name=email]', email)
  await page.fill('[name=sandi]', SANDI)
  await page.click('button[type=submit]')
}

export const pdf = () => ({ name: 'baru.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%test\n') })

export async function buatAdmin() {
  const id = randomUUID().slice(0, 8)
  return db.admin.create({ data: { nama: `Admin ${id}`, email: `admin-${id}@contoh.id`, hashSandi: await hashSandi(SANDI) } })
}
