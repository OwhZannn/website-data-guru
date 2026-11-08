import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { GalatPengguna } from '@/lib/galat'
import { prisma } from '@/lib/db'
import { catatRiwayat } from '@/lib/riwayat'

export const runtime = 'nodejs'

// Klien mengirim file yang tampil di konfirmasi; hanya file itu yang disahkan.
// File yang diganti guru setelah halaman dibuka tidak ikut disahkan tanpa dilihat.
const skema = z.object({
  guruId: z.string().min(1),
  periodeId: z.string().min(1),
  dokumen: z.array(z.object({ id: z.string().min(1), fileId: z.string().min(1) })).min(1).max(200),
})

const gagal = (pesan: string, status = 400) => Response.json({ ok: false, pesan }, { status })

export async function POST(req: Request) {
  try {
    const admin = await wajibAdmin()
    const hasil = skema.safeParse(await req.json().catch(() => null))
    if (!hasil.success) return gagal('Permintaan tidak sah')
    const { guruId, periodeId, dokumen } = hasil.data

    const guru = await prisma.guru.findUnique({ where: { id: guruId } })
    if (!guru) throw new GalatPengguna('Guru tidak ditemukan')

    const sekarang = new Date()
    const jumlah = await prisma.$transaction(async (tx) => {
      let n = 0
      for (const d of dokumen) {
        // Pembaruan bersyarat: hanya bila masih MENUNGGU dengan file yang sama.
        const { count } = await tx.dokumenGuru.updateMany({
          where: { id: d.id, guruId, periodeId, status: 'MENUNGGU', fileId: d.fileId },
          data: { status: 'SAH', alasan: null, diperiksaOleh: admin.id, diperiksaPada: sekarang },
        })
        if (count !== 1) continue
        const baris = await tx.dokumenGuru.findUniqueOrThrow({ where: { id: d.id } })
        await catatRiwayat(
          { periodeId, guruId, dokumenId: baris.dokumenId, aksi: 'sahkan', oleh: admin.id, olehTipe: 'admin' },
          tx,
        )
        n++
      }
      return n
    })

    return Response.json({ ok: true, jumlah, dilewati: dokumen.length - jumlah })
  } catch (e) {
    if (e instanceof Response) return e
    if (e instanceof GalatPengguna) return gagal(e.message)
    console.error('sahkan massal gagal', e)
    return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
