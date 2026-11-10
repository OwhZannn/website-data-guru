'use client'
import { usePathname } from 'next/navigation'
import { BookOpen, ChevronRight } from 'lucide-react'
import Tautan from '@/components/ui/Tautan'
import { DAFTAR_ISI } from './isi'

function KelompokMenu({ judul, butir, pathname, onPilih }: {
  judul: string
  butir: readonly (readonly [string, string])[]
  pathname: string
  onPilih?: () => void
}) {
  return (
    <div className="panduan-toc-kelompok">
      <h3 className="panduan-toc-judul">{judul}</h3>
      <ul className="panduan-toc-daftar">
        {butir.map(([id, teks]) => {
          const href = `/panduan/${id}`
          const aktif = pathname === href
          return (
            <li key={id}>
              <Tautan
                href={href}
                className={`panduan-toc-link${aktif ? ' aktif' : ''}`}
                aria-current={aktif ? 'page' : undefined}
                onClick={onPilih}
              >
                <span className="panduan-toc-kode">{id.toUpperCase()}</span>
                <span>{teks}</span>
              </Tautan>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Navigasi sidebar meja (desktop) yang lengket di sisi kiri. */
export function PanduanSidebarDesktop() {
  const pathname = usePathname()
  return (
    <aside className="panduan-toc-box" aria-label="Daftar isi panduan">
      <nav className="panduan-toc-side">
        <div className="panduan-toc-kelompok">
          <Tautan
            href="/panduan"
            className={`panduan-toc-link${pathname === '/panduan' ? ' aktif' : ''}`}
            aria-current={pathname === '/panduan' ? 'page' : undefined}
          >
            <BookOpen size={15} strokeWidth={2} aria-hidden="true" />
            <b>Ringkasan panduan</b>
          </Tautan>
        </div>
        <KelompokMenu judul="Bagian A · Untuk guru" butir={DAFTAR_ISI.guru} pathname={pathname} />
        <KelompokMenu judul="Bagian B · Untuk admin" butir={DAFTAR_ISI.admin} pathname={pathname} />
        <KelompokMenu judul="Lampiran" butir={DAFTAR_ISI.lampiran} pathname={pathname} />
      </nav>
    </aside>
  )
}

/** Lipatan navigasi di ponsel / layar sempit. */
export function PanduanMobileFold() {
  const pathname = usePathname()
  return (
    <details className="panduan-toc-fold">
      <summary>
        <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
        <span>Daftar isi panduan</span>
        <span className="rot"><ChevronRight size={16} strokeWidth={2} aria-hidden="true" /></span>
      </summary>
      <div className="panduan-toc-fold__isi">
        <div className="panduan-toc-kelompok">
          <Tautan
            href="/panduan"
            className={`panduan-toc-link${pathname === '/panduan' ? ' aktif' : ''}`}
            aria-current={pathname === '/panduan' ? 'page' : undefined}
          >
            <BookOpen size={15} strokeWidth={2} aria-hidden="true" />
            <b>Ringkasan panduan</b>
          </Tautan>
        </div>
        <KelompokMenu judul="Bagian A · Untuk guru" butir={DAFTAR_ISI.guru} pathname={pathname} />
        <KelompokMenu judul="Bagian B · Untuk admin" butir={DAFTAR_ISI.admin} pathname={pathname} />
        <KelompokMenu judul="Lampiran" butir={DAFTAR_ISI.lampiran} pathname={pathname} />
      </div>
    </details>
  )
}
