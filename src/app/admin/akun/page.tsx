import { halamanAdmin } from '@/lib/halaman'
import Breadcrumb from '@/components/ui/Breadcrumb'
import FormGantiSandi from '@/components/FormGantiSandi'

export const dynamic = 'force-dynamic'

export default async function HalamanAkun() {
  const admin = await halamanAdmin()
  return (
    <>
      <Breadcrumb butir={[{ href: '/admin', label: 'Beranda' }, { label: 'Akun saya' }]} />
      <h1>Akun saya</h1>
      <section className="panel" aria-label="Data akun">
        <dl className="profil-ringkas">
          <dt>Nama</dt><dd>{admin.nama}</dd>
          <dt>Email</dt><dd>{admin.email}</dd>
        </dl>
      </section>
      <FormGantiSandi endpoint="/api/admin/ganti-sandi" />
    </>
  )
}
