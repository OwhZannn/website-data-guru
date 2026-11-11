import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { aturAktifGuru, aturUlangSandiGuru, buatAkunGuru, setujuiGuru, tolakPendaftaran } from '@/lib/kelolaGuru'
import { simpanProfil, simpanTugas } from '@/lib/profil'
import { gagal, galatUmum } from '@/lib/rute'

export const runtime = 'nodejs'

const id = z.string().min(1)
const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('aktif'), guruId: id, aktif: z.boolean() }),
  z.object({ aksi: z.literal('atur_ulang_sandi'), guruId: id }),
  z.object({ aksi: z.literal('profil'), guruId: id, profil: z.unknown(), tugas: z.unknown().optional() }),
  z.object({ aksi: z.literal('tugas'), guruId: id, tugas: z.unknown() }),
  z.object({ aksi: z.literal('tambah'), data: z.unknown() }),
  z.object({ aksi: z.literal('setujui'), guruId: id }),
  z.object({ aksi: z.literal('tolak_daftar'), guruId: id }),
])

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const h = skema.safeParse(await req.json().catch(() => null))
    if (!h.success) return gagal('Permintaan tidak sah')
    const b = h.data
    if (b.aksi === 'profil') {
      return Response.json({ ok: true, ...(await simpanProfil({ guruId: b.guruId, data: b.profil, tugas: b.tugas, oleh: admin.id, olehTipe: 'admin' })) })
    }
    if (b.aksi === 'tambah') {
      const akun = await buatAkunGuru({ data: b.data, disetujui: true, oleh: admin.id })
      return Response.json(
        { ok: true, akun: { nama: akun.nama, username: akun.username, jenis: akun.jenis, sandi: akun.sandi } },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (b.aksi === 'setujui') { await setujuiGuru(b.guruId, admin.id); return Response.json({ ok: true }) }
    if (b.aksi === 'tolak_daftar') { await tolakPendaftaran(b.guruId, admin.id); return Response.json({ ok: true }) }
    if (b.aksi === 'tugas') {
      return Response.json({ ok: true, ...(await simpanTugas({ guruId: b.guruId, data: b.tugas, oleh: admin.id, olehTipe: 'admin' })) })
    }
    if (b.aksi === 'aktif') { await aturAktifGuru(b.guruId, b.aktif); return Response.json({ ok: true }) }
    return Response.json({ ok: true, ...(await aturUlangSandiGuru(b.guruId)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return galatUmum(e, 'aksi guru gagal')
  }
}
