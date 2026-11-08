// Dipanggil entrypoint.sh setiap kontainer mulai. Membuat admin dari lingkungan:
// ADMIN_EMAIL, ADMIN_SANDI (min. 8 karakter), ADMIN_NAMA (opsional).
// Admin yang sudah ada tidak diubah, kecuali ADMIN_RESET=1 (mengganti sandi dan mengaktifkan kembali).
import { hashSandi } from './scripts/buat-admin.mjs'

const { ADMIN_EMAIL, ADMIN_SANDI, ADMIN_NAMA, ADMIN_RESET } = process.env
if (!ADMIN_EMAIL && !ADMIN_SANDI) process.exit(0)

const keluar = (pesan) => {
  console.error(`[admin-awal] ${pesan}`)
  process.exit(1)
}
const surel = (ADMIN_EMAIL ?? '').trim().toLowerCase()
if (!surel.includes('@')) keluar('ADMIN_EMAIL kosong atau tidak valid; admin tidak dibuat.')
if (!ADMIN_SANDI || ADMIN_SANDI.length < 8) keluar('ADMIN_SANDI minimal 8 karakter; admin tidak dibuat.')

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()
try {
  const ada = await prisma.admin.findUnique({ where: { email: surel } })
  if (ada && ADMIN_RESET !== '1') {
    console.log(`[admin-awal] Admin ${surel} sudah ada; dilewati (isi ADMIN_RESET=1 untuk mengganti sandi).`)
  } else if (ada) {
    await prisma.admin.update({ where: { email: surel }, data: { hashSandi: await hashSandi(ADMIN_SANDI), aktif: true } })
    console.log(`[admin-awal] Sandi admin ${surel} diganti. Hapus ADMIN_RESET dan ADMIN_SANDI dari lingkungan.`)
  } else {
    if (await prisma.guru.findUnique({ where: { email: surel } })) keluar('Email sudah dipakai akun guru.')
    await prisma.admin.create({ data: { nama: ADMIN_NAMA?.trim() || 'Admin', email: surel, hashSandi: await hashSandi(ADMIN_SANDI) } })
    console.log(`[admin-awal] Admin ${surel} dibuat. Hapus ADMIN_SANDI dari lingkungan.`)
  }
} finally {
  await prisma.$disconnect()
}
