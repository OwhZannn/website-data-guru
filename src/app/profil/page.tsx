import { halamanGuru } from '@/lib/halaman'
import { profilLengkap, kolomProfilKurang } from '@/lib/syarat'
import Kepala from '@/components/Kepala'
import FormProfil from '@/components/FormProfil'
import FormGantiSandi from '@/components/FormGantiSandi'
import { teksIdentitas } from '@/lib/identitas'

export const dynamic = 'force-dynamic'

export default async function Profil() {
  const guru = await halamanGuru()
  const lengkap = profilLengkap(guru)
  const kurang = kolomProfilKurang(guru)
  return (
    <>
      <Kepala nama={guru.nama} aksi={<a href="/dokumen">Dokumen saya</a>} />
      <main className="profil-halaman">
        <h1>Profil Saya</h1>
        <p className="redup mb-s4">
          <strong className="redup-teks">{guru.nama}</strong> · {teksIdentitas(guru)}
        </p>
        {!lengkap && (
          <div className="info" role="status">
            <p className="mb-s2">Lengkapi profil ini dulu. Dokumen yang perlu Anda unggah ditentukan dari jabatan dan status kepegawaian Anda. Tugas tambahan dicentang di halaman Dokumen Saya.</p>
            {kurang.length > 0 && (
              <ul className="daftar-kurang" aria-label="Kolom yang perlu dilengkapi">
                {kurang.map((item) => (
                  <li key={item.kolom}>
                    <a href={`/profil#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="profil-kolom">
          <FormProfil awal={guru} setelahSimpan={lengkap ? undefined : '/dokumen'} />
          <FormGantiSandi />
        </div>
      </main>
    </>
  )
}
