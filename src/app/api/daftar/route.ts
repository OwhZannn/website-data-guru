import { headers } from 'next/headers'
import { buatAkunGuru } from '@/lib/kelolaGuru'
import { bolehCobaMasuk, catatGagalMasuk } from '@/lib/pembatas'
import { galatUmum } from '@/lib/rute'
import { ipKlien } from '@/lib/ipKlien'

export const runtime = 'nodejs'

/**
 * Pendaftaran mandiri guru: terbuka untuk umum, jadi dibatasi per alamat IP. Batasnya longgar (30 per 15 menit)
 * karena guru satu sekolah sering mendaftar bersamaan dari WiFi yang sama.
 */
const BATAS_DAFTAR = 30

export async function POST(req: Request) {
  try {
    const h = await headers()
    const kunci = `daftar:${ipKlien(h)}`
    if (!(await bolehCobaMasuk(kunci, BATAS_DAFTAR))) {
      return Response.json({ ok: false, pesan: 'Terlalu banyak pendaftaran dari jaringan ini. Coba lagi dalam 15 menit.' }, { status: 429 })
    }
    await catatGagalMasuk(kunci)
    const data = await req.json().catch(() => null)
    const akun = await buatAkunGuru({ data, disetujui: false })
    return Response.json(
      { ok: true, akun: { nama: akun.nama, username: akun.username, jenis: akun.jenis, sandi: akun.sandi } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return galatUmum(e, 'pendaftaran guru gagal')
  }
}
