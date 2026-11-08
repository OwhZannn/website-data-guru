import { halamanAdmin } from '@/lib/halaman'
import Kepala from '@/components/Kepala'
import FormGuruBaru from '@/components/FormGuruBaru'

export const dynamic = 'force-dynamic'

export default async function TambahGuru() {
  const admin = await halamanAdmin()
  return (
    <>
      <Kepala sub={admin.nama} tab="guru" />
      <main className="profil-halaman">
        <p className="nav-balik"><a href="/admin/guru">← Daftar guru</a></p>
        <h1>Tambah guru</h1>
        <p className="redup mb-s4">
          Isi data guru. Username dan kata sandi awal (8 angka acak) dibuat otomatis dan ditampilkan sekali setelah disimpan.
        </p>
        <FormGuruBaru mode="admin" />
      </main>
    </>
  )
}
