import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import TombolKeluar from '@/components/TombolKeluar'
import KelolaAdmin from '@/components/KelolaAdmin'

export const dynamic = 'force-dynamic'

export default async function HalamanAdmin() {
  const saya = await halamanAdmin()
  const admin = await prisma.admin.findMany({ orderBy: [{ nama: 'asc' }, { id: 'asc' }] })
  return (
    <main>
      <div className="atas">
        <h1 style={{ margin: 0, flex: 1 }}>Admin</h1>
        <TombolKeluar />
      </div>
      <p><a href="/admin">Beranda</a></p>
      <KelolaAdmin admin={admin.map((a) => ({ id: a.id, nama: a.nama, email: a.email, aktif: a.aktif }))} sayaId={saya.id} />
    </main>
  )
}
