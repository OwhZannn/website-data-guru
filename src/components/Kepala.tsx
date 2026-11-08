import type { ReactNode } from 'react'
import MenuProfil from './MenuProfil'

/** Kepala halaman guru: logo resmi, judul aplikasi, tautan halaman, dan menu profil (tema + keluar). */
export default function Kepala(p: { nama: string; aksi?: ReactNode }) {
  return (
    <header className="kepala">
      <div className="kepala-isi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="kepala-logo" src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={42} height={38} />
        <div className="kepala-teks">
          <b>Verval Sertifikasi Guru</b>
          <span>Kementerian Agama</span>
        </div>
        {p.aksi && <nav className="kepala-tautan" aria-label="Halaman guru">{p.aksi}</nav>}
        <MenuProfil
          nama={p.nama}
          peran="Guru"
          tautan={[
            { href: '/dokumen', teks: 'Dokumen saya', ikon: 'dokumen' },
            { href: '/profil', teks: 'Profil & kata sandi', ikon: 'profil' },
          ]}
        />
      </div>
    </header>
  )
}
