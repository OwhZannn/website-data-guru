import { google, type drive_v3 } from 'googleapis'
import { Readable } from 'node:stream'
import { amanUntukNamaFolder } from './namaAman'

function env(nama: string): string {
  const nilai = process.env[nama]
  if (!nilai) throw new Error(`Variabel lingkungan ${nama} belum diisi`)
  return nilai
}

// Hanya untuk tes e2e; diabaikan sepenuhnya di produksi.
const palsu = () => process.env.DRIVE_PALSU === '1' && process.env.NODE_ENV !== 'production'

let klien: drive_v3.Drive | null = null
function drive(): drive_v3.Drive {
  const id = env('GOOGLE_CLIENT_ID')
  const rahasia = env('GOOGLE_CLIENT_SECRET')
  const token = env('GOOGLE_REFRESH_TOKEN')
  if (!klien) {
    const auth = new google.auth.OAuth2(id, rahasia)
    auth.setCredentials({ refresh_token: token })
    klien = google.drive({ version: 'v3', auth })
  }
  return klien
}

const escapeQuery = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const NAMA_INDUK = 'Dokumen Guru'
let indukOtomatis: Promise<string> | null = null

/**
 * Folder induk: DRIVE_FOLDER_ID bila diisi. Bila kosong, aplikasi mencari atau membuat folder "Dokumen Guru"
 * di akarnya sendiri (scope drive.file hanya melihat berkas buatan aplikasi, jadi folder manual tidak terlihat).
 */
async function indukDrive(): Promise<string> {
  const diatur = process.env.DRIVE_FOLDER_ID
  if (diatur) return diatur
  indukOtomatis ??= (async () => {
    const d = drive()
    const { data } = await d.files.list({
      q: `name = '${NAMA_INDUK}' and 'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      orderBy: 'createdTime',
      fields: 'files(id)',
      pageSize: 1,
    })
    const ada = data.files?.[0]?.id
    if (ada) return ada
    const dibuat = await d.files.create({
      requestBody: { name: NAMA_INDUK, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    })
    return dibuat.data.id as string
  })().catch((e) => {
    indukOtomatis = null
    throw e
  })
  return indukOtomatis
}

export async function folderGuru(nip: string, nama: string): Promise<string> {
  if (palsu()) return 'folder-palsu'
  const induk = await indukDrive()
  const namaFolder = amanUntukNamaFolder(`${nip} - ${nama}`)
  const d = drive()
  const { data } = await d.files.list({
    q: `name = '${escapeQuery(namaFolder)}' and '${escapeQuery(induk)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    orderBy: 'createdTime',
    fields: 'files(id)',
    pageSize: 1,
  })
  const ada = data.files?.[0]?.id
  if (ada) return ada
  const dibuat = await d.files.create({
    requestBody: { name: namaFolder, mimeType: 'application/vnd.google-apps.folder', parents: [induk] },
    fields: 'id',
  })
  return dibuat.data.id as string
}

export async function unggahKeDrive(masukan: {
  folderId: string
  namaFile: string
  tipe: string
  isi: Buffer
}): Promise<{ fileId: string }> {
  if (palsu()) return { fileId: `palsu-${Date.now()}-${Math.random().toString(36).slice(2)}` }
  const { data } = await drive().files.create({
    requestBody: { name: masukan.namaFile, parents: [masukan.folderId] },
    media: { mimeType: masukan.tipe, body: Readable.from(masukan.isi) },
    fields: 'id',
  })
  return { fileId: data.id as string }
}

export async function hapusDariDrive(fileId: string): Promise<void> {
  if (palsu()) return
  try {
    await drive().files.delete({ fileId })
  } catch (e: any) {
    if (e?.code === 404 || e?.status === 404) return
    throw e
  }
}

export async function unduhInfoFile(
  fileId: string,
): Promise<{ nama: string; tipe: string; ukuran: number } | null> {
  try {
    const { data } = await drive().files.get({ fileId, fields: 'name,mimeType,size' })
    return { nama: data.name ?? '', tipe: data.mimeType ?? '', ukuran: Number(data.size ?? 0) }
  } catch (e: any) {
    if (e?.code === 404 || e?.status === 404) return null
    throw e
  }
}

/** Mengunduh berkas langsung dari Google Drive sebagai stream untuk pratinjau atau unduh internal. */
export async function unduhStreamDrive(fileId: string): Promise<{
  stream: Readable
  nama: string
  tipe: string
  ukuran: number
} | null> {
  if (palsu()) {
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF\n')
    return {
      stream: Readable.from(dummyPdf),
      nama: 'dokumen.pdf',
      tipe: 'application/pdf',
      ukuran: dummyPdf.length,
    }
  }
  try {
    const d = drive()
    const meta = await d.files.get({ fileId, fields: 'name,mimeType,size' })
    const res = await d.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
    return {
      stream: res.data as Readable,
      nama: meta.data.name ?? 'dokumen.pdf',
      tipe: meta.data.mimeType ?? 'application/pdf',
      ukuran: Number(meta.data.size ?? 0),
    }
  } catch (e: any) {
    if (e?.code === 404 || e?.status === 404) return null
    throw e
  }
}

/** Pemeriksaan kesehatan: satu panggilan ringan ke folder induk, dengan batas waktu. */
export async function periksaDrive(batasMs = 5000): Promise<void> {
  if (palsu()) return
  const induk = await indukDrive()
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), batasMs)
  try {
    await drive().files.list(
      { pageSize: 1, fields: 'files(id)', q: `'${escapeQuery(induk)}' in parents` },
      { signal: ac.signal },
    )
  } catch (e) {
    if (ac.signal.aborted) throw Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT' })
    throw e
  } finally {
    clearTimeout(t)
  }
}
