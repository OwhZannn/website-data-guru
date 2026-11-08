/**
 * Fungsi murni untuk mengurutkan daftar guru di halaman daftar guru admin.
 *
 * Aturan utama yang tidak bisa diubah:
 *   - Guru yang belum disetujui (disetujui === false) selalu muncul paling atas
 *     sebagai kelompok pertama, terlepas dari kolom urut yang dipilih.
 *   - Di dalam setiap kelompok, baru diterapkan urutan kolom yang dipilih.
 *
 * Kolom yang bisa diurut: nama | sekolah | progres | aktivitas
 * Arah: asc (bawaan) | desc
 */

export type KolomUrut = 'nama' | 'sekolah' | 'progres' | 'aktivitas'
export type ArahUrut = 'asc' | 'desc'

export const KOLOM_VALID: KolomUrut[] = ['nama', 'sekolah', 'progres', 'aktivitas']
export const ARAH_VALID: ArahUrut[] = ['asc', 'desc']

export type ItemUrutGuru = {
  id: string
  nama: string
  disetujui: boolean
  asalSekolah?: string | null
  /** Jumlah dokumen sah (untuk kolom progres). */
  jumlahSah: number
  /** Total dokumen wajib (untuk kolom progres). */
  jumlahWajib: number
  /** Waktu aktivitas terakhir (epoch ms) atau null bila belum ada. */
  aktivitasTerakhir: number | null
}

/** Validasi dan normalisasi parameter urut dari query string. */
export function parseUrut(urut?: string, arah?: string): { kolom: KolomUrut; arah: ArahUrut } {
  const kolom = KOLOM_VALID.includes(urut as KolomUrut) ? (urut as KolomUrut) : 'nama'
  const arahBersih = ARAH_VALID.includes(arah as ArahUrut) ? (arah as ArahUrut) : 'asc'
  return { kolom, arah: arahBersih }
}

/**
 * Mengurutkan daftar guru:
 * 1. Kelompok belum disetujui (disetujui === false) selalu di atas.
 * 2. Di dalam kelompok, urutkan berdasarkan `kolom` dan `arah`.
 * 3. Kolom bawaan (nama, asc) mereproduksi perilaku lama.
 */
export function urutkanGuru<T extends ItemUrutGuru>(
  daftar: T[],
  kolom: KolomUrut,
  arah: ArahUrut,
): T[] {
  const copy = [...daftar]

  function nilaiKunci(item: T): string | number {
    switch (kolom) {
      case 'nama':
        return item.nama.toLowerCase()
      case 'sekolah':
        return (item.asalSekolah ?? '').toLowerCase()
      case 'progres':
        // Rasio sah/wajib; bila wajib 0 anggap 1 agar tidak NaN.
        return item.jumlahWajib > 0 ? item.jumlahSah / item.jumlahWajib : 0
      case 'aktivitas':
        // null dianggap paling lama (epoch 0)
        return item.aktivitasTerakhir ?? 0
    }
  }

  copy.sort((a, b) => {
    // Kelompok: belum disetujui lebih dulu
    const kelompokA = a.disetujui ? 1 : 0
    const kelompokB = b.disetujui ? 1 : 0
    if (kelompokA !== kelompokB) return kelompokA - kelompokB

    // Urutkan dalam kelompok
    const na = nilaiKunci(a)
    const nb = nilaiKunci(b)
    let cmp: number
    if (typeof na === 'string' && typeof nb === 'string') {
      cmp = na.localeCompare(nb, 'id')
    } else {
      cmp = (na as number) - (nb as number)
    }
    return arah === 'desc' ? -cmp : cmp
  })

  return copy
}
