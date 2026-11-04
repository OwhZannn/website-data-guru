import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { aturAktifGuru, aturUlangSandiGuru } from '@/lib/kelolaGuru'
import { gagal, galatUmum } from '@/lib/rute'

export const runtime = 'nodejs'

const id = z.string().min(1)
const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('aktif'), guruId: id, aktif: z.boolean() }),
  z.object({ aksi: z.literal('atur_ulang_sandi'), guruId: id }),
])

export async function POST(req: Request) {
  try {
    await wajibAdmin()
    const h = skema.safeParse(await req.json().catch(() => null))
    if (!h.success) return gagal('Permintaan tidak sah')
    const b = h.data
    if (b.aksi === 'aktif') { await aturAktifGuru(b.guruId, b.aktif); return Response.json({ ok: true }) }
    return Response.json({ ok: true, ...(await aturUlangSandiGuru(b.guruId)) })
  } catch (e) {
    return galatUmum(e, 'aksi guru gagal')
  }
}
