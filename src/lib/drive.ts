import { google, type drive_v3 } from 'googleapis'
import { Readable } from 'node:stream'
import { amanUntukNamaFolder } from './namaAman'

function env(nama: string): string {
  const nilai = process.env[nama]
  if (!nilai) throw new Error(`Variabel lingkungan ${nama} belum diisi`)
  return nilai
}

let klien: drive_v3.Drive | null = null
function drive(): drive_v3.Drive {
  const id = env('GOOGLE_CLIENT_ID')
  const rahasia = env('GOOGLE_CLIENT_SECRET')
  const token = env('GOOGLE_REFRESH_TOKEN')
  env('DRIVE_FOLDER_ID')
  if (!klien) {
    const auth = new google.auth.OAuth2(id, rahasia)
    auth.setCredentials({ refresh_token: token })
    klien = google.drive({ version: 'v3', auth })
  }
  return klien
}

const escapeQuery = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

export async function folderGuru(nip: string, nama: string): Promise<string> {
  const induk = env('DRIVE_FOLDER_ID')
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
  const { data } = await drive().files.create({
    requestBody: { name: masukan.namaFile, parents: [masukan.folderId] },
    media: { mimeType: masukan.tipe, body: Readable.from(masukan.isi) },
    fields: 'id',
  })
  return { fileId: data.id as string }
}

export async function hapusDariDrive(fileId: string): Promise<void> {
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
