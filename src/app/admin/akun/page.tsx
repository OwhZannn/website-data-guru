import { halamanAdmin } from '@/lib/halaman'
import FormGantiSandi from '@/components/FormGantiSandi'
import PageHeader from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function HalamanAkun() {
  const admin = await halamanAdmin()
  return (
    <div className="halaman-tabel">
      <PageHeader judul="Akun saya" keterangan="Data akun dan kata sandi" />
      <div className="kartu-penuh">
        <section className="kartu-penuh__kiri" aria-label="Data akun">
          <h2>Data akun</h2>
          <dl className="profil-ringkas">
            <dt>Nama</dt><dd>{admin.nama}</dd>
            <dt>Email</dt><dd>{admin.email}</dd>
          </dl>
        </section>
        <div className="kartu-penuh__kanan">
          <FormGantiSandi endpoint="/api/admin/ganti-sandi" polos />
        </div>
      </div>
    </div>
  )
}
