/** Fungsi murni untuk DataTable dan formulir filter otomatis. */

export type ArahUrut = 'asc' | 'desc'

/** Nilai `aria-sort` untuk satu kolom: hanya kolom yang sedang diurut yang berarah. */
export function ariaSort(arahAktif: ArahUrut | null | undefined): 'ascending' | 'descending' | 'none' {
  if (arahAktif === 'asc') return 'ascending'
  if (arahAktif === 'desc') return 'descending'
  return 'none'
}

/** Klik pada tajuk: kolom belum aktif atau sedang menaik jadi menaik→menurun; sedang menurun kembali menaik. */
export function arahBerikut(arahAktif: ArahUrut | null | undefined): ArahUrut {
  return arahAktif === 'asc' ? 'desc' : 'asc'
}

type Nilai = string | number | boolean | null | undefined

/**
 * Susun query string (diawali "?") dari parameter dasar ditimpa `ubah`.
 * Nilai kosong, null, atau undefined dibuang sehingga tautan tetap bersih.
 */
export function bangunTautan(dasar: Record<string, Nilai>, ubah: Record<string, Nilai> = {}): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...dasar, ...ubah })) {
    if (v === null || v === undefined || v === '' || v === false) continue
    p.set(k, String(v))
  }
  const teks = p.toString()
  return teks ? `?${teks}` : '?'
}

/** "Menampilkan 1–20 dari 45 guru"; daftar kosong: "Menampilkan 0 dari 0 guru". */
export function teksRentang(dari: number, sampai: number, total: number, satuan = ''): string {
  const akhir = satuan ? ` ${satuan}` : ''
  return total === 0 ? `Menampilkan 0 dari 0${akhir}` : `Menampilkan ${dari}–${sampai} dari ${total}${akhir}`
}

/**
 * Alamat tujuan dari isian formulir filter. Isian kosong dibuang, dan `hal` selalu dibuang
 * karena mengubah filter harus kembali ke halaman pertama.
 */
export function urlDariIsian(jalur: string, entri: Iterable<[string, FormDataEntryValue]>): string {
  const p = new URLSearchParams()
  for (const [k, v] of entri) {
    if (typeof v !== 'string' || v === '' || k === 'hal') continue
    p.set(k, v)
  }
  const teks = p.toString()
  return teks ? `${jalur}?${teks}` : jalur
}

/** Dua kumpulan parameter dianggap sama bila isinya sama, apa pun urutannya. */
export function samaParam(a: URLSearchParams, b: URLSearchParams): boolean {
  const urut = (p: URLSearchParams) => [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('&')
  return urut(a) === urut(b)
}
