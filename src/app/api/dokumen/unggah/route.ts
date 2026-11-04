import { wajibGuru } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { unggahDokumen } from '@/lib/unggahDokumen'
import { GalatDrive, GalatPengguna } from '@/lib/galat'

export const runtime = 'nodejs'
export const maxDuration = 60

const gagal = (pesan: string) => Response.json({ ok: false, pesan }, { status: 400 })

export async function POST(req: Request) {
  try {
    const guru = await wajibGuru()
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return gagal('Permintaan tidak sah')
    }
    const dokumenId = form.get('dokumenId')
    const berkas = form.get('berkas')
    if (typeof dokumenId !== 'string' || !dokumenId) return gagal('Dokumen belum dipilih')
    if (!(berkas instanceof File)) return gagal('Berkas belum dipilih')

    const periode = await prisma.periode.findFirst({ where: { dibuka: true } })
    if (!periode) return gagal('Masa pengunggahan sedang ditutup')

    const hasil = await unggahDokumen({
      guruId: guru.id,
      periodeId: periode.id,
      dokumenId,
      nama: berkas.name,
      tipe: berkas.type,
      isi: Buffer.from(await berkas.arrayBuffer()),
      oleh: guru.id,
    })
    return Response.json({ ok: true, status: hasil.status })
  } catch (e) {
    if (e instanceof Response) return e
    // GalatDrive diteruskan apa adanya; Task 16 akan menerjemahkannya.
    if (e instanceof GalatPengguna || e instanceof GalatDrive) return gagal(e.message)
    console.error('unggah dokumen gagal', e)
    return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
  }
}
