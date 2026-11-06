import type { ReactNode } from 'react'
import TombolKeluar from './TombolKeluar'

const TAB_ADMIN = [
  ['beranda', '/admin', 'Beranda'],
  ['guru', '/admin/guru', 'Guru'],
  ['periode', '/admin/periode', 'Periode'],
  ['admin', '/admin/admin', 'Admin'],
] as const

export type TabAdmin = (typeof TAB_ADMIN)[number][0]

/** Kepala halaman: logo resmi, judul aplikasi, nama pengguna, tombol keluar; tab menu untuk admin. */
export default function Kepala(p: { sub: string; aksi?: ReactNode; tab?: TabAdmin }) {
  const admin = p.tab !== undefined
  return (
    <header className={admin ? 'kepala lebar' : 'kepala'}>
      <div className="kepala-isi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="kepala-logo" src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={42} height={38} />
        <div className="kepala-teks">
          <b>{admin ? 'Panel Admin' : 'Verval Sertifikasi Guru'}</b>
          <span>{p.sub}</span>
        </div>
        <div className="kepala-aksi">
          {p.aksi}
          <TombolKeluar />
        </div>
      </div>
      {admin && (
        <nav className="tab" aria-label="Menu admin">
          {TAB_ADMIN.map(([k, href, teks]) => (
            <a key={k} href={href} aria-current={p.tab === k ? 'page' : undefined}>{teks}</a>
          ))}
        </nav>
      )}
    </header>
  )
}
