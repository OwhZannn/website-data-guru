import { halamanAdmin } from '@/lib/halaman'
import Kepala from '@/components/Kepala'
import ImporGuru from '@/components/ImporGuru'

export const dynamic = 'force-dynamic'

export default async function HalamanImporGuru() {
  const admin = await halamanAdmin()
  return (
    <>
      <Kepala sub={admin.nama} tab="guru" />
      <main className="lebar w-impor">
        <p className="nav-balik"><a href="/admin/guru">← Daftar guru</a></p>
        <h1>Impor guru</h1>
        <section className="panel">
          <ImporGuru />
        </section>
      </main>
    </>
  )
}
