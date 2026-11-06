import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import Kepala from '@/components/Kepala'
import KelolaAdmin from '@/components/KelolaAdmin'

export const dynamic = 'force-dynamic'

export default async function HalamanAdmin() {
  const saya = await halamanAdmin()
  const admin = await prisma.admin.findMany({ orderBy: [{ nama: 'asc' }, { id: 'asc' }] })
  return (
    <>
      <Kepala sub={saya.nama} tab="admin" />
      <main className="lebar">
        <h1>Admin</h1>
        <KelolaAdmin admin={admin.map((a) => ({ id: a.id, nama: a.nama, email: a.email, aktif: a.aktif }))} sayaId={saya.id} />
      </main>
    </>
  )
}
