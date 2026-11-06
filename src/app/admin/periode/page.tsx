import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import Kepala from '@/components/Kepala'
import KelolaPeriode from '@/components/KelolaPeriode'

export const dynamic = 'force-dynamic'

export default async function HalamanPeriode() {
  const admin = await halamanAdmin()
  const periode = await prisma.periode.findMany({ orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }] })
  return (
    <>
      <Kepala sub={admin.nama} tab="periode" />
      <main className="lebar">
        <h1>Periode</h1>
        <KelolaPeriode periode={periode.map((p) => ({ id: p.id, nama: p.nama, dibuka: p.dibuka }))} />
      </main>
    </>
  )
}
