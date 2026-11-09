import { halamanAdmin } from '@/lib/halaman'
import { prisma } from '@/lib/db'
import KelolaAlasan from '@/components/KelolaAlasan'

export const dynamic = 'force-dynamic'

export default async function HalamanAlasan() {
  await halamanAdmin()
  const baris = await prisma.alasanTolak.findMany({
    orderBy: [{ urutan: 'asc' }, { dibuatPada: 'asc' }],
  })

  return (
    <div className="halaman-tabel">
      <KelolaAlasan baris={baris} />
    </div>
  )
}
