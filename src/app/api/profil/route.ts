import { wajibGuru } from '@/lib/auth'
import { simpanProfil } from '@/lib/profil'
import { galatUmum } from '@/lib/rute'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const guru = await wajibGuru()
    const data = await req.json().catch(() => null)
    const hasil = await simpanProfil({ guruId: guru.id, data, oleh: guru.id, olehTipe: 'guru' })
    return Response.json({ ok: true, ...hasil })
  } catch (e) {
    return galatUmum(e, 'simpan profil gagal')
  }
}
