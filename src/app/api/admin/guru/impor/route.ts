import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { imporGuru, uraiDaftarGuru } from '@/lib/imporGuru'
import { gagal, galatUmum } from '@/lib/rute'

export const runtime = 'nodejs'

const skema = z.object({ teks: z.string().max(2_000_000) })

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const h = skema.safeParse(await req.json().catch(() => null))
    if (!h.success) return gagal('Permintaan tidak sah')
    const baris = uraiDaftarGuru(h.data.teks)
    if (baris.length === 0) return gagal('Daftar guru kosong')
    return Response.json({ ok: true, ...(await imporGuru({ baris, adminId: admin.id })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return galatUmum(e, 'impor guru gagal')
  }
}
