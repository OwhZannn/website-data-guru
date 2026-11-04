import { wajibAdmin } from '@/lib/auth'
import { statusBasisData, statusDrive } from '@/lib/kesehatan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await wajibAdmin()
  } catch (e) {
    if (e instanceof Response) return e
    return Response.json({ ok: false, pesan: 'Tidak diizinkan' }, { status: 401 })
  }
  const [drive, basisData] = await Promise.all([statusDrive(), statusBasisData()])
  return Response.json({ ...drive, basisData }, { headers: { 'Cache-Control': 'no-store' } })
}
