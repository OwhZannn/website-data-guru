// Unggah cadangan terbaru ke Drive: node scripts/cadangan-ke-drive.mjs [dirCadangan]
// Memakai GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, DRIVE_FOLDER_ID.
import { createReadStream, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const NAMA_SUBFOLDER = 'Cadangan Basis Data'
const POLA = /^prod-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.db$/

/** Nama berkas cadangan terbaru (tanggal, lalu nomor suffix), atau null. */
export function pilihTerbaru(nama) {
  const kunci = (f) => {
    const [, t, n] = f.match(POLA)
    return `${t}#${String(n ?? 1).padStart(6, '0')}`
  }
  const cocok = nama.filter((f) => POLA.test(f)).sort((a, b) => kunci(a).localeCompare(kunci(b)))
  return cocok.length ? cocok[cocok.length - 1] : null
}

export const namaDiDrive = (berkas) => berkas

async function utama() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, DRIVE_FOLDER_ID } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !DRIVE_FOLDER_ID) {
    console.error('Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, dan DRIVE_FOLDER_ID di lingkungan.')
    process.exit(1)
  }
  const dir = process.argv[2] ?? process.env.DIR_CADANGAN ?? 'data/cadangan'
  const berkas = existsSync(dir) ? pilihTerbaru(readdirSync(dir)) : null
  if (!berkas) {
    console.error(`Tidak ada berkas cadangan prod-YYYY-MM-DD.db di ${dir}. Jalankan scripts/cadangan.mjs dahulu.`)
    process.exit(1)
  }
  const { google } = await import('googleapis')
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN })
  const drive = google.drive({ version: 'v3', auth })
  const q = `name = '${NAMA_SUBFOLDER}' and '${DRIVE_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const { data } = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 })
  let folderId = data.files?.[0]?.id
  if (!folderId) {
    const dibuat = await drive.files.create({
      requestBody: { name: NAMA_SUBFOLDER, mimeType: 'application/vnd.google-apps.folder', parents: [DRIVE_FOLDER_ID] },
      fields: 'id',
    })
    folderId = dibuat.data.id
  }
  await drive.files.create({
    requestBody: { name: namaDiDrive(berkas), parents: [folderId] },
    media: { mimeType: 'application/vnd.sqlite3', body: createReadStream(join(dir, berkas)) },
    fields: 'id',
  })
  console.log(`Terunggah ke Drive (${NAMA_SUBFOLDER}): ${berkas}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  utama().catch((e) => {
    console.error(`Unggah cadangan ke Drive GAGAL: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  })
}
