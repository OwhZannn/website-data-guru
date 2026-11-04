import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { aktifkanAdmin, nonaktifkanAdmin, tambahAdmin } from '@/lib/kelolaAdmin'
import { acakSandiAwal } from '@/lib/imporGuru'
import { gagal, galatUmum } from '@/lib/rute'

export const runtime = 'nodejs'

const id = z.string().min(1)
const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('tambah'), nama: z.string().min(1).max(200), email: z.string().min(1).max(320) }),
  z.object({ aksi: z.literal('nonaktif'), adminId: id }),
  z.object({ aksi: z.literal('aktif'), adminId: id }),
])

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const h = skema.safeParse(await req.json().catch(() => null))
    if (!h.success) return gagal('Permintaan tidak sah')
    const b = h.data
    if (b.aksi === 'tambah') {
      const sandi = acakSandiAwal()
      const { id: baruId } = await tambahAdmin({ nama: b.nama, email: b.email, sandi, olehAdminId: admin.id })
      return Response.json({ ok: true, id: baruId, sandi }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (b.aksi === 'nonaktif') await nonaktifkanAdmin({ adminId: b.adminId, olehAdminId: admin.id })
    else await aktifkanAdmin(b.adminId)
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return galatUmum(e, 'aksi admin gagal')
  }
}
