import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { buatPeriode, bukaPeriode, tutupPeriode } from '@/lib/periode'
import { salinDaftarDokumen } from '@/lib/salinDokumen'
import { gagal, galatUmum } from '@/lib/rute'

export const runtime = 'nodejs'

const id = z.string().min(1)
const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('buat'), nama: z.string() }),
  z.object({ aksi: z.literal('buka'), periodeId: id }),
  z.object({ aksi: z.literal('tutup'), periodeId: id }),
  z.object({ aksi: z.literal('salin'), dariPeriodeId: id, kePeriodeId: id }),
])

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const h = skema.safeParse(await req.json().catch(() => null))
    if (!h.success) return gagal('Permintaan tidak sah')
    const b = h.data
    const adminId = admin.id
    if (b.aksi === 'buat') return Response.json({ ok: true, ...(await buatPeriode({ nama: b.nama, adminId })) })
    if (b.aksi === 'buka') await bukaPeriode({ periodeId: b.periodeId, adminId })
    else if (b.aksi === 'tutup') await tutupPeriode({ periodeId: b.periodeId, adminId })
    else return Response.json({ ok: true, ...(await salinDaftarDokumen({ dariPeriodeId: b.dariPeriodeId, kePeriodeId: b.kePeriodeId, adminId })) })
    return Response.json({ ok: true })
  } catch (e) {
    return galatUmum(e, 'aksi periode gagal')
  }
}
