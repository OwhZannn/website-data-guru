import { execSync } from 'node:child_process'

import { rmSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { hashSandi } from '../../src/lib/sandi'

const BASIS = 'http://localhost:3100'

const panaskan = async (jalur: string, init?: RequestInit) => {
  try { await fetch(BASIS + jalur, { redirect: 'manual', ...init }) } catch { /* cukup dicoba */ }
}

/** Masuk lewat API lalu kembalikan header Cookie berisi sesi; null bila gagal. */
async function masukSebagai(email: string, sandi: string): Promise<string | null> {
  try {
    const r = await fetch(BASIS + '/api/auth/masuk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, sandi }),
    })
    const sesi = r.headers.getSetCookie().find((c) => c.startsWith('sesi='))
    return sesi ? sesi.split(';')[0] : null
  } catch {
    return null
  }
}

export default async function setup() {
  for (const f of ['e2e.db', 'e2e.db-journal']) rmSync(`prisma/${f}`, { force: true })
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./e2e.db' },
  })

  // Server dev menyusun tiap rute saat pertama diminta, termasuk bagian halaman yang hanya tampil
  // setelah masuk. Tes pertama bisa kehabisan waktu menunggu penyusunan itu, jadi rute utama dipanaskan
  // di sini: sekali tanpa sesi, lalu dengan sesi admin dan guru sungguhan.
  await panaskan('/masuk')
  await panaskan('/daftar')
  // Tanpa sesi semuanya dijawab 401, tapi rutenya sudah tersusun.
  for (const jalur of [
    '/api/admin/keputusan', '/api/admin/guru', '/api/admin/guru/impor', '/api/admin/periode',
    '/api/admin/dokumen', '/api/admin/admin', '/api/dokumen/unggah', '/api/ganti-sandi', '/api/auth/keluar', '/api/profil', '/api/tugas', '/api/daftar',
  ]) await panaskan(jalur, { method: 'POST' })
  await panaskan('/api/admin/rekap')

  const db = new PrismaClient({ datasources: { db: { url: 'file:./e2e.db' } } })
  try {
    const sandi = 'pemanasan-123'
    const hash = await hashSandi(sandi)
    const periode = await db.periode.create({ data: { nama: 'Pemanasan' } })
    await db.admin.create({ data: { nama: 'Pemanasan', email: 'pemanasan-admin@contoh.invalid', hashSandi: hash } })
    const guru = await db.guru.create({
      data: {
        nama: 'Pemanasan', username: '0', nip: '0', email: 'pemanasan-guru@contoh.invalid', hashSandi: hash,
        asalSekolah: 'Pemanasan', statusPegawai: 'PNS', tahunSertifikasi: 2020,
      },
    })
    const admin = await masukSebagai('pemanasan-admin@contoh.invalid', sandi)
    if (admin) {
      for (const jalur of [
        '/admin', '/admin/guru', `/admin/guru/${guru.id}`, '/admin/guru/impor', '/admin/guru/tambah', '/admin/periode',
        `/admin/periode/${periode.id}/dokumen`, '/admin/admin',
      ]) await panaskan(jalur, { headers: { cookie: admin } })
    }
    const g = await masukSebagai('0', sandi) // guru masuk dengan username (NIP)
    if (g) for (const jalur of ['/dokumen', '/profil', '/ganti-sandi']) await panaskan(jalur, { headers: { cookie: g } })

    // Bersihkan lagi supaya tes mulai dari basis data yang sama seperti sebelumnya.
    await db.sesi.deleteMany()
    await db.percobaanMasuk.deleteMany()
    await db.guru.delete({ where: { id: guru.id } })
    await db.admin.deleteMany({ where: { email: 'pemanasan-admin@contoh.invalid' } })
    await db.periode.delete({ where: { id: periode.id } })
  } finally {
    await db.$disconnect()
  }
}
