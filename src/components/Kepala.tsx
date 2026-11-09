import type { ReactNode } from 'react'
import type { Periode } from '@prisma/client'
import MenuProfil from './MenuProfil'
import PilihPeriodeHeader from './PilihPeriodeHeader'

/** Kepala halaman guru: logo resmi, judul aplikasi, tautan halaman, pemilih periode (bila ada lebih dari satu), dan menu profil. */
export default function Kepala(p: {
  nama: string
  aksi?: ReactNode
  periode?: { daftar: Pick<Periode, 'id' | 'nama' | 'dibuka'>[]; dipilih: string }
}) {
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
        {p.periode && p.periode.daftar.length >= 2 && (
          <PilihPeriodeHeader daftar={p.periode.daftar} dipilih={p.periode.dipilih} varian="guru" />
        )}
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
