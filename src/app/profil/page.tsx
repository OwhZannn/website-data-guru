import { halamanGuru } from '@/lib/halaman'
import { profilLengkap } from '@/lib/syarat'
import Kepala from '@/components/Kepala'
import FormProfil from '@/components/FormProfil'
import FormGantiSandi from '@/components/FormGantiSandi'
import { teksIdentitas } from '@/lib/identitas'

export const dynamic = 'force-dynamic'

export default async function Profil() {
  const guru = await halamanGuru()
  const lengkap = profilLengkap(guru)
  return (
    <>
      <Kepala sub={guru.nama} aksi={<a href="/dokumen">Dokumen saya</a>} />
      <main className="profil-halaman">
        <h1>Profil Saya</h1>
        <p className="redup" style={{ margin: '0 0 14px' }}>
          <strong style={{ color: 'var(--teks)' }}>{guru.nama}</strong> · {teksIdentitas(guru)}
        </p>
        {!lengkap && (
          <p className="info" role="status">
            Lengkapi profil ini dulu. Dokumen yang perlu Anda unggah ditentukan dari jabatan dan status kepegawaian Anda. Tugas tambahan dicentang di halaman Dokumen Saya.
          </p>
        )}
        <FormProfil awal={guru} setelahSimpan={lengkap ? undefined : '/dokumen'} />
        <div style={{ height: 20 }} />
        <FormGantiSandi />
      </main>
    </>
  )
}
