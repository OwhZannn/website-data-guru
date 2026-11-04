import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { GalatPengguna } from '@/lib/galat'
import { sahkanDokumen, tolakDokumen, batalkanKeputusan } from '@/lib/keputusan'

export const runtime = 'nodejs'

const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('sahkan'), dokumenGuruId: z.string().min(1) }),
  z.object({ aksi: z.literal('tolak'), dokumenGuruId: z.string().min(1), alasan: z.string().optional() }),
  z.object({
    aksi: z.literal('batalkan'),
    dokumenGuruId: z.string().min(1),
    alasan: z.string().optional(),
    statusBaru: z.enum(['SAH', 'DITOLAK'], { message: 'Status baru belum dipilih' }),
  }),
])

const gagal = (pesan: string) => Response.json({ ok: false, pesan }, { status: 400 })

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const hasil = skema.safeParse(await req.json().catch(() => null))
    if (!hasil.success) return gagal(hasil.error.issues[0]?.path[0] === 'statusBaru' ? 'Status baru belum dipilih' : 'Permintaan tidak sah')
    const b = hasil.data
    // Alasan kosong diteruskan apa adanya; fungsi keputusan yang menegakkan aturannya.
    if (b.aksi === 'sahkan') await sahkanDokumen({ dokumenGuruId: b.dokumenGuruId, adminId: admin.id })
    else if (b.aksi === 'tolak') await tolakDokumen({ dokumenGuruId: b.dokumenGuruId, adminId: admin.id, alasan: b.alasan ?? '' })
    else await batalkanKeputusan({ dokumenGuruId: b.dokumenGuruId, adminId: admin.id, alasan: b.alasan ?? '', statusBaru: b.statusBaru })
    return Response.json({ ok: true })
  } catch (e) {
    if (e instanceof Response) return e
    if (e instanceof GalatPengguna) return gagal(e.message)
    console.error('keputusan admin gagal', e)
    return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
