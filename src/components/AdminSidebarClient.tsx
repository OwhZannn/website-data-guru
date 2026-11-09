'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, Inbox, Users, CalendarDays, MessageSquareX, Shield,
  PanelLeftClose, PanelLeftOpen, X, Menu,
} from 'lucide-react'
import { KUNCI_LIPAT } from '@/lib/tema'

type Butir = {
  teks: string
  href: string
  Ikon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  cocok: (p: string) => boolean
  badgeKey?: string
}

const KELOMPOK: { judul: string; butir: Butir[] }[] = [
  {
    judul: 'Utama',
    butir: [
      { teks: 'Beranda', href: '/admin', Ikon: LayoutDashboard, cocok: (p) => p === '/admin' },
      { teks: 'Antrean', href: '/admin/antrean', Ikon: Inbox, cocok: (p) => p.startsWith('/admin/antrean'), badgeKey: 'antrean' },
    ],
  },
  {
    judul: 'Data',
    butir: [
      { teks: 'Guru', href: '/admin/guru', Ikon: Users, cocok: (p) => p.startsWith('/admin/guru') },
      { teks: 'Periode', href: '/admin/periode', Ikon: CalendarDays, cocok: (p) => p.startsWith('/admin/periode') },
    ],
  },
  {
    judul: 'Pengaturan',
    butir: [
      { teks: 'Alasan penolakan', href: '/admin/alasan', Ikon: MessageSquareX, cocok: (p) => p.startsWith('/admin/alasan') },
      { teks: 'Admin', href: '/admin/admin', Ikon: Shield, cocok: (p) => p === '/admin/admin' },
    ],
  },
]

function buatHref(href: string, periode?: string | null) {
  if (!periode) return href
  const u = new URL(href, 'http://x')
  u.searchParams.set('periode', periode)
  return u.pathname + u.search
}

/** Daftar menu berkelompok; dipakai sidebar desktop dan laci ponsel. */
function DaftarMenu({ jumlahAntrean }: { jumlahAntrean: number }) {
  const pathname = usePathname()
  // Layout tidak bisa membaca ?periode=; tautan hanya membawa periode yang dipilih di URL.
  const periodeUrl = useSearchParams().get('periode')
  return (
    <nav aria-label="Menu admin" className="admin-nav">
      {KELOMPOK.map((k) => (
        <div key={k.judul} className="admin-nav-kelompok">
          <p className="admin-nav-judul">{k.judul}</p>
          <ul className="admin-nav-daftar">
            {k.butir.map((m) => {
              const aktif = m.cocok(pathname)
              const badge = m.badgeKey === 'antrean' && jumlahAntrean > 0 ? jumlahAntrean : null
              return (
                <li key={m.href} data-tip={m.teks}>
                  <a
                    href={buatHref(m.href, periodeUrl)}
                    className={`admin-nav-butir${aktif ? ' aktif' : ''}`}
                    aria-current={aktif ? 'page' : undefined}
                  >
                    <span className="admin-nav-butir__ikon"><m.Ikon size={18} strokeWidth={1.8} /></span>
                    <span className="admin-nav-butir__teks">{m.teks}</span>
                    {badge !== null && <span className="admin-nav-butir__badge">{badge}</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/**
 * Sidebar desktop (tampil ≥ 1024 px lewat CSS). Status lipat disimpan di localStorage dan di
 * atribut data-sidebar pada <html> (dipasang skrip awal sebelum digambar) sehingga tidak berkedip.
 */
export function AdminSidebar({ jumlahAntrean }: { jumlahAntrean: number; periodeId?: string | null }) {
  const [dilipat, setDilipat] = useState(false)

  useEffect(() => {
    setDilipat(document.documentElement.getAttribute('data-sidebar') === 'lipat')
  }, [])

  function toggleLipat() {
    const berikut = !dilipat
    setDilipat(berikut)
    if (berikut) document.documentElement.setAttribute('data-sidebar', 'lipat')
    else document.documentElement.removeAttribute('data-sidebar')
    try { localStorage.setItem(KUNCI_LIPAT, berikut ? '1' : '0') } catch {}
  }

  return (
    <aside className="admin-sidebar">
      <DaftarMenu jumlahAntrean={jumlahAntrean} />
      <div className="admin-sidebar__kaki" data-tip="Buka menu">
        <button
          type="button"
          onClick={toggleLipat}
          aria-expanded={!dilipat}
          aria-label={dilipat ? 'Buka menu samping' : undefined}
          className="admin-sidebar__tombol-lipat"
        >
          <span className="admin-nav-butir__ikon">
            <PanelLeftClose size={18} strokeWidth={1.8} aria-hidden="true" className="ikon-lipat" />
            <PanelLeftOpen size={18} strokeWidth={1.8} aria-hidden="true" className="ikon-buka" />
          </span>
          <span className="admin-sidebar__tombol-teks">Lipat menu</span>
        </button>
      </div>
    </aside>
  )
}

/** Laci navigasi ponsel (< 1024 px) dengan tombol hamburger di header. */
export function AdminLaci({ jumlahAntrean }: { jumlahAntrean: number; periodeId?: string | null }) {
  const pathname = usePathname()
  const [buka, setBuka] = useState(false)
  const laciBtnRef = useRef<HTMLButtonElement>(null)

  /* tutup laci saat pathname berubah (navigasi) */
  useEffect(() => { setBuka(false) }, [pathname])

  const laciRef = useRef<HTMLDivElement>(null)
  const pernahBuka = useRef(false)

  /* Fokus masuk ke laci saat dibuka, Tab terkunci di dalamnya, Escape menutup. */
  useEffect(() => {
    if (!buka) {
      // Kembalikan fokus ke tombol pembuka hanya setelah laci benar-benar pernah dibuka.
      if (pernahBuka.current) laciBtnRef.current?.focus()
      return
    }
    pernahBuka.current = true
    const laci = laciRef.current
    const fokusable = () =>
      Array.from(laci?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
    // Laci baru terlihat setelah transisi visibilitas dimulai; fokus ditunda satu frame.
    const t = requestAnimationFrame(() => fokusable()[0]?.focus())
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { setBuka(false); return }
      if (e.key !== 'Tab') return
      const el = fokusable()
      if (el.length === 0) return
      const pertama = el[0], terakhir = el[el.length - 1]
      if (e.shiftKey && document.activeElement === pertama) { e.preventDefault(); terakhir.focus() }
      else if (!e.shiftKey && document.activeElement === terakhir) { e.preventDefault(); pertama.focus() }
    }
    document.addEventListener('keydown', handler)
    return () => { cancelAnimationFrame(t); document.removeEventListener('keydown', handler) }
  }, [buka])

  return (
    <>
      <button
        ref={laciBtnRef}
        type="button"
        onClick={() => setBuka(true)}
        aria-label="Buka menu navigasi"
        aria-expanded={buka}
        className="hamburger-btn"
      >
        <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div
        className={`admin-laci-overlay${buka ? ' buka' : ''}`}
        onClick={() => setBuka(false)}
        aria-hidden="true"
      />
      <div
        ref={laciRef}
        className={`admin-laci${buka ? ' buka' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu admin"
      >
        <div className="admin-laci__header">
          <span className="admin-laci__judul">Menu Admin</span>
          <button
            type="button"
            onClick={() => setBuka(false)}
            aria-label="Tutup menu"
            className="admin-laci__tutup"
          >
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <DaftarMenu jumlahAntrean={jumlahAntrean} />
      </div>
    </>
  )
}
