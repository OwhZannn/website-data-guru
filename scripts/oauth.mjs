// Skrip sekali-jalan untuk admin: node scripts/oauth.mjs [kode]
// Butuh GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di lingkungan.
import { google } from 'googleapis'

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di lingkungan terlebih dahulu.')
  process.exit(1)
}
const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, 'http://localhost')
const kode = process.argv[2]

if (!kode) {
  console.log('Buka URL ini, setujui, lalu salin parameter "code" dari URL tujuan:\n')
  console.log(
    auth.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    }),
  )
  console.log('\nLalu jalankan: node scripts/oauth.mjs <kode>')
} else {
  const { tokens } = await auth.getToken(decodeURIComponent(kode))
  if (!tokens.refresh_token) {
    console.error('Tidak ada refresh token. Cabut akses aplikasi di akun Google lalu ulangi.')
    process.exit(1)
  }
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`)
}
