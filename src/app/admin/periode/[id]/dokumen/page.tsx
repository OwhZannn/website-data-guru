import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import Kepala from '@/components/Kepala'
import KelolaDokumen from '@/components/KelolaDokumen'

export const dynamic = 'force-dynamic'

export default async function DaftarDokumenPeriode({ params }: { params: Promise<{ id: string }> }) {
  const admin = await halamanAdmin()
  const { id } = await params
  const periode = await prisma.periode.findUnique({ where: { id } })
  if (!periode) notFound()
  const dokumen = await prisma.daftarDokumen.findMany({ where: { periodeId: id }, orderBy: [{ urutan: 'asc' }, { id: 'asc' }] })

  return (
    <>
      <Kepala sub={admin.nama} tab="periode" />
      <main className="lebar">
      <p className="nav-balik"><a href="/admin/periode">← Semua periode</a></p>
      <h1>Daftar Dokumen</h1>
      <p className="redup">{periode.nama}</p>
      <KelolaDokumen
        periodeId={id}
        aktif={dokumen.filter((d) => d.aktif).map((d) => ({ id: d.id, nama: d.nama, urutan: d.urutan, berlakuUntuk: d.berlakuUntuk }))}
        nonaktif={dokumen.filter((d) => !d.aktif).map((d) => ({ id: d.id, nama: d.nama, urutan: d.urutan, berlakuUntuk: d.berlakuUntuk }))}
      />
      </main>
    </>
  )
}
