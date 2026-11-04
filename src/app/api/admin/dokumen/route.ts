import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { GalatPengguna } from '@/lib/galat'
import {
  tambahDokumen, ubahDokumen, nonaktifkanDokumen, aktifkanKembaliDokumen, hitungDampakDokumenBaru,
} from '@/lib/kelolaDokumen'

export const runtime = 'nodejs'

const id = z.string().min(1)
const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('tambah'), periodeId: id, nama: z.string() }),
  z.object({ aksi: z.literal('ubah'), periodeId: id, dokumenId: id, nama: z.string().optional(), arah: z.enum(['naik', 'turun']).optional() }),
  z.object({ aksi: z.literal('nonaktifkan'), periodeId: id, dokumenId: id }),
  z.object({ aksi: z.literal('aktifkan'), periodeId: id, dokumenId: id }),
])

const gagal = (pesan: string) => Response.json({ ok: false, pesan }, { status: 400 })
const galatUmum = (e: unknown, konteks: string) => {
  if (e instanceof Response) return e
  if (e instanceof GalatPengguna) return gagal(e.message)
  console.error(konteks, e)
  return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
}

/** Dampak: berapa guru lengkap yang jadi tidak lengkap bila dokumen ditambah (atau dokumenId diaktifkan kembali). */
export async function GET(req: Request) {
  try {
    await wajibAdmin()
    const url = new URL(req.url)
    const periodeId = url.searchParams.get('periodeId')
    if (!periodeId) return gagal('Permintaan tidak sah')
    const dampak = await hitungDampakDokumenBaru(periodeId, url.searchParams.get('dokumenId') ?? undefined)
    return Response.json({ ok: true, dampak })
  } catch (e) {
    return galatUmum(e, 'hitung dampak dokumen gagal')
  }
}

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const hasil = skema.safeParse(await req.json().catch(() => null))
    if (!hasil.success) return gagal('Permintaan tidak sah')
    const b = hasil.data
    if (b.aksi === 'tambah') await tambahDokumen({ periodeId: b.periodeId, nama: b.nama, adminId: admin.id })
    else if (b.aksi === 'ubah') await ubahDokumen({ periodeId: b.periodeId, dokumenId: b.dokumenId, nama: b.nama, arah: b.arah, adminId: admin.id })
    else if (b.aksi === 'nonaktifkan') await nonaktifkanDokumen({ periodeId: b.periodeId, dokumenId: b.dokumenId, adminId: admin.id })
    else await aktifkanKembaliDokumen({ periodeId: b.periodeId, dokumenId: b.dokumenId, adminId: admin.id })
    return Response.json({ ok: true })
  } catch (e) {
    return galatUmum(e, 'kelola dokumen gagal')
  }
}
