import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { GalatPengguna } from '@/lib/galat'
import { prisma } from '@/lib/db'
import { catatRiwayat } from '@/lib/riwayat'

export const runtime = 'nodejs'

const skema = z.object({
  guruId: z.string().min(1),
  periodeId: z.string().min(1),
})

const gagal = (pesan: string, status = 400) => Response.json({ ok: false, pesan }, { status })

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const hasil = skema.safeParse(await req.json().catch(() => null))
    if (!hasil.success) return gagal('Permintaan tidak sah')
    const { guruId, periodeId } = hasil.data

    const guru = await prisma.guru.findUnique({ where: { id: guruId } })
    if (!guru) throw new GalatPengguna('Guru tidak ditemukan')

    const menunggu = await prisma.dokumenGuru.findMany({
      where: { guruId, periodeId, status: 'MENUNGGU', fileId: { not: null } },
    })
    if (menunggu.length === 0) return Response.json({ ok: true, jumlah: 0 })

    const sekarang = new Date()
    await prisma.$transaction(async (tx) => {
      for (const dok of menunggu) {
        await tx.dokumenGuru.update({
          where: { id: dok.id },
          data: { status: 'SAH', alasan: null, diperiksaOleh: admin.id, diperiksaPada: sekarang },
        })
        await catatRiwayat(
          {
            periodeId: dok.periodeId,
            guruId: dok.guruId,
            dokumenId: dok.dokumenId,
            aksi: 'sahkan',
            oleh: admin.id,
            olehTipe: 'admin',
          },
          tx,
        )
      }
    })

    return Response.json({ ok: true, jumlah: menunggu.length })
  } catch (e) {
    if (e instanceof Response) return e
    if (e instanceof GalatPengguna) return gagal(e.message)
    console.error('sahkan massal gagal', e)
    return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
