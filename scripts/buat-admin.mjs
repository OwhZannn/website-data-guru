// Buat admin pertama: node scripts/buat-admin.mjs "Nama Lengkap" email@sekolah.sch.id
// Mencetak sandi acak satu kali. Butuh DATABASE_URL (jalur absolut) dan `npm ci` sudah dijalankan.
import { randomBytes, scrypt } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Format sama persis dengan src/lib/sandi.ts: scrypt$<garam hex 16 byte>$<kunci hex 64 byte>.
export function hashSandi(sandi) {
  const garam = randomBytes(16)
  return new Promise((ok, gagal) =>
    scrypt(sandi, garam, 64, (err, k) => (err ? gagal(err) : ok(`scrypt$${garam.toString('hex')}$${k.toString('hex')}`))),
  )
}

export const buatSandiAcak = () => randomBytes(12).toString('base64url')

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [nama, email] = process.argv.slice(2)
  if (!nama || !email || !email.includes('@')) {
    console.error('Pemakaian: node scripts/buat-admin.mjs "Nama Lengkap" email@contoh.id')
    process.exit(1)
  }
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const sandi = buatSandiAcak()
    await prisma.admin.create({ data: { nama, email: email.trim().toLowerCase(), hashSandi: await hashSandi(sandi) } })
    console.log(`Admin dibuat: ${email}\nSandi (catat sekarang, tidak ditampilkan lagi): ${sandi}`)
  } catch (e) {
    console.error(`Gagal membuat admin: ${e instanceof Error ? e.message : e}`)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}
