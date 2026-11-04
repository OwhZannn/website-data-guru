import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import TombolKeluar from '@/components/TombolKeluar'
import KelolaPeriode from '@/components/KelolaPeriode'

export const dynamic = 'force-dynamic'

export default async function HalamanPeriode() {
  await halamanAdmin()
  const periode = await prisma.periode.findMany({ orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }] })
  return (
    <main>
      <div className="atas">
        <h1 style={{ margin: 0, flex: 1 }}>Periode</h1>
        <TombolKeluar />
      </div>
      <p><a href="/admin">Beranda</a></p>
      <KelolaPeriode periode={periode.map((p) => ({ id: p.id, nama: p.nama, dibuka: p.dibuka }))} />
    </main>
  )
}
