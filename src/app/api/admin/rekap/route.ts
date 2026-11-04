import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { galatUmum } from '@/lib/rute'
import { buatCsv, buatXlsx, susunRekap } from '@/lib/rekap'
import { tanggalLokal } from '@/lib/waktu'

export const runtime = 'nodejs'

const skema = z.object({ periodeId: z.string().min(1), format: z.enum(['csv', 'xlsx']) })

export async function GET(req: Request) {
  try {
    await wajibAdmin()
    const u = new URL(req.url).searchParams
    const h = skema.safeParse({ periodeId: u.get('periodeId'), format: u.get('format') })
    if (!h.success) throw new GalatPengguna('Permintaan tidak sah')
    const periode = await prisma.periode.findUnique({ where: { id: h.data.periodeId } })
    if (!periode) throw new GalatPengguna('Periode tidak ditemukan')
    const baris = await susunRekap(periode.id)
    const slug = periode.nama.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'periode'
    const nama = `rekap-${slug}-${tanggalLokal(new Date())}.${h.data.format}`
    const header = {
      'Content-Disposition': `attachment; filename="${nama}"`,
      'Cache-Control': 'no-store',
    }
    if (h.data.format === 'csv') {
      return new Response(buatCsv(baris), { headers: { ...header, 'Content-Type': 'text/csv; charset=utf-8' } })
    }
    return new Response(new Uint8Array(await buatXlsx(baris)), {
      headers: { ...header, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    })
  } catch (e) {
    return galatUmum(e, 'rekap gagal')
  }
}
