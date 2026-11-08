import { halamanAdmin } from '@/lib/halaman'
import ImporGuru from '@/components/ImporGuru'
import Breadcrumb from '@/components/ui/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function HalamanImporGuru() {
  await halamanAdmin()
  return (
    <>
      <Breadcrumb butir={[
        { label: 'Beranda', href: '/admin' },
        { label: 'Guru', href: '/admin/guru' },
        { label: 'Impor guru' },
      ]} />
      <h1>Impor guru</h1>
      <section className="panel">
        <ImporGuru />
      </section>
    </>
  )
}
