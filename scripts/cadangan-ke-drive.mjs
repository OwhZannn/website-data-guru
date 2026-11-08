// Unggah cadangan terbaru ke Drive: node scripts/cadangan-ke-drive.mjs [dirCadangan]
// Memakai GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN; DRIVE_FOLDER_ID opsional (kosong = akar Drive).
import { createReadStream, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const NAMA_SUBFOLDER = 'Cadangan Basis Data'
const POLA = /^prod-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.db$/

const kunci = (f) => {
  const [, t, n] = f.match(POLA)
  return `${t}#${String(n ?? 1).padStart(6, '0')}`
}

/** Nama berkas cadangan terbaru (tanggal, lalu nomor suffix), atau null. */
export function pilihTerbaru(nama) {
  const cocok = nama.filter((f) => POLA.test(f)).sort((a, b) => kunci(a).localeCompare(kunci(b)))
  return cocok.length ? cocok[cocok.length - 1] : null
}

export const SIMPAN_DI_DRIVE = 30

/**
 * Berkas Drive yang harus dihapus: hanya yang namanya cocok pola cadangan,
 * di luar `simpan` berkas terbaru. Berkas yang tidak cocok pola tidak pernah dipilih.
 * @param {{ id: string, name: string }[]} berkas
 */
export function pilihUntukDihapus(berkas, simpan = SIMPAN_DI_DRIVE) {
  const cocok = berkas.filter((b) => POLA.test(b.name)).sort((a, b) => kunci(b.name).localeCompare(kunci(a.name)))
  return cocok.slice(Math.max(0, simpan))
}

export const namaDiDrive = (berkas) => berkas

async function utama() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, DRIVE_FOLDER_ID } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.error('Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REFRESH_TOKEN di lingkungan.')
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
  const induk = DRIVE_FOLDER_ID || 'root'
  const q = `name = '${NAMA_SUBFOLDER}' and '${induk}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const { data } = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 })
  let folderId = data.files?.[0]?.id
  if (!folderId) {
    const dibuat = await drive.files.create({
      requestBody: { name: NAMA_SUBFOLDER, mimeType: 'application/vnd.google-apps.folder', parents: [induk] },
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

  // Pangkas: simpan 30 cadangan terbaru di folder ini, hapus yang lebih lama.
  const semua = []
  let pageToken
  do {
    const r = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      pageToken,
    })
    semua.push(...(r.data.files ?? []))
    pageToken = r.data.nextPageToken ?? undefined
  } while (pageToken)
  for (const f of pilihUntukDihapus(semua)) {
    await drive.files.delete({ fileId: f.id })
    console.log(`Cadangan lama dihapus dari Drive: ${f.name}`)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  utama().catch((e) => {
    console.error(`Unggah cadangan ke Drive GAGAL: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  })
}
