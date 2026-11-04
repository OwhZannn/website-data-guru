export type HasilGalatDrive = { pesan: string; perluTindakan: boolean }

const TERPUTUS = 'Hubungan ke Google Drive terputus. Hubungi admin.'
const PENUH = 'Penyimpanan Google Drive penuh. Hubungi admin.'
const KONEKSI = 'Koneksi sedang bermasalah. Silakan coba lagi.'
const BELUM = 'Google Drive belum dikonfigurasi. Hubungi admin.'
const UMUM = 'Gagal menyimpan ke Google Drive. Silakan coba lagi.'

/** Menerjemahkan galat googleapis/jaringan menjadi pesan Indonesia yang aman bagi guru. */
export function terjemahkanGalatDrive(e: unknown): HasilGalatDrive {
  const o = (e && typeof e === 'object' ? e : {}) as Record<string, any>
  const teks = [
    e instanceof Error ? e.message : typeof e === 'string' ? e : '',
    typeof o.code === 'string' ? o.code : '',
    o.errors?.[0]?.reason,
    typeof o.response?.data?.error === 'string' ? o.response.data.error : o.response?.data?.error?.status,
  ].filter((x) => typeof x === 'string').join(' ')
  const angka = [o.code, o.status, o.response?.status].map(Number).find((n) => Number.isInteger(n) && n >= 100)
  const alasan = [o.errors?.[0]?.reason, o.response?.data?.error?.errors?.[0]?.reason].join(' ')

  if (/Variabel lingkungan .* belum diisi/.test(teks)) return { pesan: BELUM, perluTindakan: true }
  if (/storageQuotaExceeded|quotaExceeded/.test(`${teks} ${alasan}`)) return { pesan: PENUH, perluTindakan: true }
  if (/invalid_grant|unauthorized_client/.test(teks) || angka === 401 || angka === 403)
    return { pesan: TERPUTUS, perluTindakan: true }
  if (/ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/.test(teks) || angka === 429 || (angka !== undefined && angka >= 500))
    return { pesan: KONEKSI, perluTindakan: false }
  return { pesan: UMUM, perluTindakan: false }
}
