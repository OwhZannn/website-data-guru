import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import Breadcrumb from '@/components/ui/Breadcrumb'
import KelolaDokumen from '@/components/KelolaDokumen'

export const dynamic = 'force-dynamic'

export default async function DaftarDokumenPeriode({ params }: { params: Promise<{ id: string }> }) {
  await halamanAdmin()
  const { id } = await params
  const periode = await prisma.periode.findUnique({ where: { id } })
  if (!periode) notFound()
  const dokumen = await prisma.daftarDokumen.findMany({ where: { periodeId: id }, orderBy: [{ urutan: 'asc' }, { id: 'asc' }] })

  return (
    <div className="halaman-tabel">
      <Breadcrumb butir={[
        { label: 'Beranda', href: '/admin' },
        { label: 'Periode', href: '/admin/periode' },
        { label: periode.nama, href: `/admin/periode/${id}/dokumen` },
        { label: 'Dokumen' },
      ]} />
      <KelolaDokumen
        periodeId={id}
        periodeNama={periode.nama}
        aktif={dokumen.filter((d) => d.aktif).map((d) => ({ id: d.id, nama: d.nama, urutan: d.urutan, berlakuUntuk: d.berlakuUntuk }))}
        nonaktif={dokumen.filter((d) => !d.aktif).map((d) => ({ id: d.id, nama: d.nama, urutan: d.urutan, berlakuUntuk: d.berlakuUntuk }))}
      />
    </div>
  )
}
