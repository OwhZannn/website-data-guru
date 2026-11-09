import { halamanAdmin } from '@/lib/halaman'
import FormGuruBaru from '@/components/FormGuruBaru'
import Breadcrumb from '@/components/ui/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function TambahGuru() {
  await halamanAdmin()
  return (
    <>
      <Breadcrumb butir={[
        { label: 'Beranda', href: '/admin' },
        { label: 'Guru', href: '/admin/guru' },
        { label: 'Tambah guru' },
      ]} />
      <div className="halaman-sempit">
        <h1>Tambah guru</h1>
        <p className="redup mb-s4">
          Isi data guru. Username dan kata sandi awal (8 angka acak) dibuat otomatis dan ditampilkan sekali setelah disimpan.
        </p>
        <FormGuruBaru mode="admin" />
      </div>
    </>
  )
}
