import { halamanAdmin } from '@/lib/halaman'
import { prisma } from '@/lib/db'
import Breadcrumb from '@/components/ui/Breadcrumb'
import KelolaAlasan from '@/components/KelolaAlasan'

export const dynamic = 'force-dynamic'

export default async function HalamanAlasan() {
  await halamanAdmin()
  const baris = await prisma.alasanTolak.findMany({
    orderBy: [{ urutan: 'asc' }, { dibuatPada: 'asc' }],
  })

  return (
    <>
      <Breadcrumb butir={[{ href: '/admin', label: 'Beranda' }, { label: 'Alasan Penolakan' }]} />
      <div className="judul-aksi" style={{ marginBottom: 'var(--s-4)' }}>
        <h1>Alasan Penolakan</h1>
      </div>
      <p className="redup" style={{ marginBottom: 'var(--s-5)' }}>
        Preset teks yang bisa diklik saat menolak dokumen. Alasan yang disimpan tetap teks biasa sehingga mengubah atau menonaktifkan preset tidak memengaruhi keputusan lama.
      </p>
      <KelolaAlasan baris={baris} />
    </>
  )
}
