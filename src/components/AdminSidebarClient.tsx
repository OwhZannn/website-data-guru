'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, Inbox, Users, CalendarDays, MessageSquareX, Shield,
  PanelLeftClose, PanelLeftOpen, X, Menu,
} from 'lucide-react'

const KUNCI_LIPAT = 'admin-sidebar-collapsed'

const MENU: {
  teks: string
  href: string
  Ikon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  cocok: (p: string) => boolean
  badgeKey?: string
}[] = [
  { teks: 'Beranda', href: '/admin', Ikon: LayoutDashboard, cocok: (p) => p === '/admin' },
  { teks: 'Antrean', href: '/admin/antrean', Ikon: Inbox, cocok: (p) => p.startsWith('/admin/antrean'), badgeKey: 'antrean' },
  { teks: 'Guru', href: '/admin/guru', Ikon: Users, cocok: (p) => p.startsWith('/admin/guru') },
  { teks: 'Periode', href: '/admin/periode', Ikon: CalendarDays, cocok: (p) => p.startsWith('/admin/periode') },
  { teks: 'Alasan penolakan', href: '/admin/alasan', Ikon: MessageSquareX, cocok: (p) => p.startsWith('/admin/alasan') },
  { teks: 'Admin', href: '/admin/admin', Ikon: Shield, cocok: (p) => p === '/admin/admin' },
]

function buatHref(href: string, periode?: string | null) {
  if (!periode) return href
  const u = new URL(href, 'http://x')
  u.searchParams.set('periode', periode)
  return u.pathname + u.search
}

/** Sidebar yang dapat dilipat — desktop only (ditampilkan via CSS >= 1024 px). */
export function AdminSidebar({
  jumlahAntrean,
  periodeId,
}: {
  jumlahAntrean: number
  periodeId?: string | null
}) {
  const pathname = usePathname()
  // Layout tidak bisa membaca ?periode=; tautan hanya membawa periode yang dipilih di URL.
  const periodeUrl = useSearchParams().get('periode')
  const [dilipat, setDilipat] = useState(false)

  useEffect(() => {
    try {
      setDilipat(localStorage.getItem(KUNCI_LIPAT) === '1')
    } catch {}
  }, [])

  function toggleLipat() {
    const berikut = !dilipat
    setDilipat(berikut)
    try {
      localStorage.setItem(KUNCI_LIPAT, berikut ? '1' : '0')
    } catch {}
  }

  return (
    <aside className={`admin-sidebar${dilipat ? ' dilipat' : ''}`} aria-label={dilipat ? undefined : 'Menu admin'}>
      <div className="admin-sidebar__header">
        <button
          onClick={toggleLipat}
          aria-label={dilipat ? 'Buka sidebar' : 'Lipat sidebar'}
          aria-expanded={!dilipat}
          className="admin-sidebar__tombol-lipat"
        >
          {dilipat
            ? <PanelLeftOpen size={18} strokeWidth={1.8} />
            : <PanelLeftClose size={18} strokeWidth={1.8} />}
        </button>
      </div>
      <nav aria-label="Menu admin">
        {MENU.map((m) => {
          const aktif = m.cocok(pathname)
          const badge = m.badgeKey === 'antrean' && jumlahAntrean > 0 ? jumlahAntrean : null
          return (
            <a
              key={m.href}
              href={buatHref(m.href, periodeUrl)}
              className={`admin-nav-butir${aktif ? ' aktif' : ''}`}
              aria-current={aktif ? 'page' : undefined}
              title={dilipat ? m.teks : undefined}
            >
              <span className="admin-nav-butir__ikon"><m.Ikon size={18} strokeWidth={1.8} /></span>
              <span className="admin-nav-butir__teks">{m.teks}</span>
              {badge !== null && <span className="admin-nav-butir__badge">{badge}</span>}
            </a>
          )
        })}
      </nav>
    </aside>
  )
}

/** Tombol hamburger di header mobile. */
export function TombolHamburger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Buka menu navigasi"
      aria-expanded={false}
      className="admin-kepala__hamburger"
    >
      <Menu size={22} strokeWidth={1.8} />
    </button>
  )
}

/** Laci navigasi mobile. */
export function AdminLaci({
  jumlahAntrean,
  periodeId,
}: {
  jumlahAntrean: number
  periodeId?: string | null
}) {
  const pathname = usePathname()
  // Layout tidak bisa membaca ?periode=; tautan hanya membawa periode yang dipilih di URL.
  const periodeUrl = useSearchParams().get('periode')
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
    fokusable()[0]?.focus()
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
    return () => document.removeEventListener('keydown', handler)
  }, [buka])

  return (
    <>
      <button
        ref={laciBtnRef}
        onClick={() => setBuka(true)}
        aria-label="Buka menu navigasi"
        aria-expanded={buka}
        className="hamburger-btn"
      >
        <Menu size={22} strokeWidth={1.8} />
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
            onClick={() => setBuka(false)}
            aria-label="Tutup menu"
            className="admin-laci__tutup"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <nav aria-label="Menu admin">
          {MENU.map((m) => {
            const aktif = m.cocok(pathname)
            const badge = m.badgeKey === 'antrean' && jumlahAntrean > 0 ? jumlahAntrean : null
            return (
              <a
                key={m.href}
                href={buatHref(m.href, periodeUrl)}
                className={`admin-nav-butir${aktif ? ' aktif' : ''}`}
                aria-current={aktif ? 'page' : undefined}
              >
                <span className="admin-nav-butir__ikon"><m.Ikon size={18} strokeWidth={1.8} /></span>
                <span className="admin-nav-butir__teks">{m.teks}</span>
                {badge !== null && <span className="admin-nav-butir__badge">{badge}</span>}
              </a>
            )
          })}
        </nav>
      </div>
    </>
  )
}
