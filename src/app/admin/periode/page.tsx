import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import KelolaPeriode from '@/components/KelolaPeriode'

export const dynamic = 'force-dynamic'

export default async function HalamanPeriode() {
  await halamanAdmin()
  const periode = await prisma.periode.findMany({ orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }] })
  return (
    <div className="halaman-tabel">
      <KelolaPeriode periode={periode.map((p) => ({ id: p.id, nama: p.nama, dibuka: p.dibuka }))} />
    </div>
  )
}
