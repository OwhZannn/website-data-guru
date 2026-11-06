import type { DaftarDokumen, DokumenGuru } from '@prisma/client'
import type { StatusDokumen } from '@/lib/status-dokumen'
import { wajibBagi, type ProfilSyarat } from '@/lib/syarat'

export type StatusGuru = {
  lengkap: boolean
  jumlahSah: number
  jumlahWajib: number
  adaDitolak: boolean
  label: 'Belum mulai' | 'Perlu dicek' | 'Ada yang ditolak' | 'Lengkap'
}

// Fungsi murni: satu-satunya sumber kebenaran "Terverifikasi" (tidak pernah disimpan).
// Dokumen aktif tanpa baris DokumenGuru dihitung belum diunggah; baris untuk
// dokumen yang tidak aktif diabaikan. Bila profil diberikan, hanya dokumen yang
// wajib bagi guru itu (lihat `wajibBagi`) yang dihitung.
export function hitungStatusGuru(
  dokumenAktif: (Pick<DaftarDokumen, 'id' | 'aktif'> & { berlakuUntuk?: string })[],
  dokumenGuru: Pick<DokumenGuru, 'dokumenId' | 'status'>[],
  profil?: ProfilSyarat,
): StatusGuru {
  const wajib = new Set(
    dokumenAktif
      .filter(d => d.aktif && (!profil || wajibBagi(d.berlakuUntuk ?? 'semua', profil)))
      .map(d => d.id),
  )
  const status = new Map<string, string>()
  for (const g of dokumenGuru) if (wajib.has(g.dokumenId)) status.set(g.dokumenId, g.status)

  const nilai = [...status.values()] as StatusDokumen[]
  const jumlahSah = nilai.filter(s => s === 'SAH').length
  const adaDitolak = nilai.includes('DITOLAK')
  const adaMenunggu = nilai.includes('MENUNGGU')
  const jumlahWajib = wajib.size
  const lengkap = jumlahWajib > 0 && jumlahSah === jumlahWajib

  const label: StatusGuru['label'] = adaDitolak
    ? 'Ada yang ditolak'
    : lengkap
      ? 'Lengkap'
      : adaMenunggu
        ? 'Perlu dicek'
        : 'Belum mulai'
  return { lengkap, jumlahSah, jumlahWajib, adaDitolak, label }
}
