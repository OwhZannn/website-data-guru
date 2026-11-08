import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { GalatPengguna } from '@/lib/galat'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

const id = z.string().min(1)
const teksZ = z.string().transform((s) => s.trim()).pipe(z.string().min(1, 'Teks alasan wajib diisi').max(200, 'Teks alasan maksimal 200 karakter'))

const skema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('tambah'), teks: teksZ }),
  z.object({ aksi: z.literal('ubah'), id, teks: teksZ }),
  z.object({ aksi: z.literal('aktifkan'), id }),
  z.object({ aksi: z.literal('nonaktifkan'), id }),
  z.object({ aksi: z.literal('urut'), id, arah: z.enum(['naik', 'turun']) }),
])

const gagal = (pesan: string, status = 400) => Response.json({ ok: false, pesan }, { status })
const galatUmum = (e: unknown, konteks: string) => {
  if (e instanceof Response) return e
  if (e instanceof GalatPengguna) return gagal(e.message)
  console.error(konteks, e)
  return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
}

/** GET /api/admin/alasan — daftar aktif; ?semua=1 untuk semua (admin). */
export async function GET(req: Request) {
  try {
    await wajibAdmin()
    const url = new URL(req.url)
    const semua = url.searchParams.get('semua') === '1'
    const baris = await prisma.alasanTolak.findMany({
      where: semua ? undefined : { aktif: true },
      orderBy: [{ urutan: 'asc' }, { dibuatPada: 'asc' }],
    })
    return Response.json({ ok: true, baris })
  } catch (e) {
    return galatUmum(e, 'daftar alasan gagal')
  }
}

export async function POST(req: Request) {
  try {
    await wajibAdmin()
    const hasil = skema.safeParse(await req.json().catch(() => null))
    if (!hasil.success) return gagal(hasil.error.issues[0]?.message ?? 'Permintaan tidak sah')
    const b = hasil.data

    if (b.aksi === 'tambah') {
      const max = await prisma.alasanTolak.aggregate({ _max: { urutan: true } })
      await prisma.alasanTolak.create({ data: { teks: b.teks, urutan: (max._max.urutan ?? 0) + 1 } })
    } else if (b.aksi === 'ubah') {
      const ada = await prisma.alasanTolak.findUnique({ where: { id: b.id } })
      if (!ada) throw new GalatPengguna('Alasan tidak ditemukan')
      await prisma.alasanTolak.update({ where: { id: b.id }, data: { teks: b.teks } })
    } else if (b.aksi === 'aktifkan') {
      const ada = await prisma.alasanTolak.findUnique({ where: { id: b.id } })
      if (!ada) throw new GalatPengguna('Alasan tidak ditemukan')
      await prisma.alasanTolak.update({ where: { id: b.id }, data: { aktif: true } })
    } else if (b.aksi === 'nonaktifkan') {
      const ada = await prisma.alasanTolak.findUnique({ where: { id: b.id } })
      if (!ada) throw new GalatPengguna('Alasan tidak ditemukan')
      await prisma.alasanTolak.update({ where: { id: b.id }, data: { aktif: false } })
    } else {
      // urut: tukar urutan dengan baris tetangga
      const semua = await prisma.alasanTolak.findMany({ orderBy: [{ urutan: 'asc' }, { dibuatPada: 'asc' }] })
      const idx = semua.findIndex((r) => r.id === b.id)
      if (idx === -1) throw new GalatPengguna('Alasan tidak ditemukan')
      const targetIdx = b.arah === 'naik' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= semua.length) return gagal('Tidak dapat dipindah lebih jauh')
      const a = semua[idx]
      const t = semua[targetIdx]
      await prisma.$transaction([
        prisma.alasanTolak.update({ where: { id: a.id }, data: { urutan: t.urutan } }),
        prisma.alasanTolak.update({ where: { id: t.id }, data: { urutan: a.urutan } }),
      ])
    }

    return Response.json({ ok: true })
  } catch (e) {
    return galatUmum(e, 'kelola alasan gagal')
  }
}
