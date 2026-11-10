'use client'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, LogOut, User, FileText, UserCog } from 'lucide-react'
import PilihTema from './PilihTema'
import { useKeluar } from './TombolKeluar'
import Tautan from './ui/Tautan'

type TautanMenu = { href: string; teks: string; ikon: 'profil' | 'dokumen' | 'akun' }

const IKON = { profil: User, dokumen: FileText, akun: UserCog } as const

function inisial(nama: string) {
  const kata = nama.trim().split(/\s+/).filter(Boolean)
  const huruf = kata.length > 1 ? kata[0][0] + kata[kata.length - 1][0] : (kata[0] ?? '?').slice(0, 2)
  return huruf.toUpperCase()
}

/**
 * Menu akun di sudut kanan atas: avatar inisial, nama, peran, lalu dropdown berisi tautan akun,
 * pilihan tema, dan Keluar. Mengikuti pola WAI-ARIA menu button.
 */
export default function MenuProfil({ nama, peran, keterangan, tautan = [] }: {
  nama: string
  peran: 'Admin' | 'Guru'
  keterangan?: string
  tautan?: TautanMenu[]
}) {
  const [buka, setBuka] = useState(false)
  const pemicu = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  const { keluar, pesan } = useKeluar()

  const butir = () =>
    Array.from(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])

  function tutup(kembaliFokus = true) {
    setBuka(false)
    if (kembaliFokus) pemicu.current?.focus()
  }

  // Fokus ke butir pertama setiap kali menu terbuka.
  useEffect(() => {
    if (buka) butir()[0]?.focus()
  }, [buka])

  // Klik di luar menutup tanpa merebut fokus dari target klik.
  useEffect(() => {
    if (!buka) return
    function luar(e: PointerEvent) {
      const t = e.target as Node
      if (menu.current?.contains(t) || pemicu.current?.contains(t)) return
      setBuka(false)
    }
    document.addEventListener('pointerdown', luar)
    return () => document.removeEventListener('pointerdown', luar)
  }, [buka])

  function tekanMenu(e: KeyboardEvent<HTMLDivElement>) {
    const el = butir()
    const i = el.indexOf(document.activeElement as HTMLElement)
    const pindah = (j: number) => { e.preventDefault(); el[(j + el.length) % el.length]?.focus() }
    switch (e.key) {
      case 'Escape': e.preventDefault(); tutup(); break
      case 'Tab': setBuka(false); break
      case 'ArrowDown': case 'ArrowRight': pindah(i + 1); break
      case 'ArrowUp': case 'ArrowLeft': pindah(i - 1); break
      case 'Home': pindah(0); break
      case 'End': pindah(el.length - 1); break
    }
  }

  function tekanPemicu(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' && !buka) { e.preventDefault(); setBuka(true) }
  }

  return (
    <div className="menu-profil">
      <button
        ref={pemicu}
        type="button"
        className="menu-profil__pemicu"
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-controls={buka ? id : undefined}
        aria-label={`Menu akun ${nama}, ${peran}`}
        onClick={() => setBuka((b) => !b)}
        onKeyDown={tekanPemicu}
      >
        <span className="menu-profil__avatar" aria-hidden="true">{inisial(nama)}</span>
        <span className="menu-profil__identitas">
          <span className="menu-profil__nama">{nama}</span>
          <span className="menu-profil__peran">{peran}</span>
        </span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className="menu-profil__panah" />
      </button>

      {buka && (
        <div ref={menu} id={id} role="menu" aria-label="Menu akun" className="menu-profil__isi" onKeyDown={tekanMenu}>
          <div className="menu-profil__kepala" aria-hidden="true">
            <span className="menu-profil__avatar menu-profil__avatar--besar">{inisial(nama)}</span>
            <span className="menu-profil__identitas">
              <span className="menu-profil__nama">{nama}</span>
              <span className="menu-profil__peran">{keterangan ?? peran}</span>
            </span>
          </div>

          {tautan.length > 0 && (
            <div className="menu-profil__bagian">
              {tautan.map((t) => {
                const Ikon = IKON[t.ikon]
                return (
                  <Tautan key={t.href} href={t.href} role="menuitem" tabIndex={-1} className="menu-profil__butir">
                    <Ikon size={16} strokeWidth={1.8} aria-hidden="true" />{t.teks}
                  </Tautan>
                )
              })}
            </div>
          )}

          <div className="menu-profil__bagian">
            <p className="menu-profil__judul" aria-hidden="true">Tema</p>
            <PilihTema dalamMenu />
          </div>

          <div className="menu-profil__bagian">
            <button type="button" role="menuitem" tabIndex={-1} className="menu-profil__butir menu-profil__butir--keluar" onClick={keluar}>
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />Keluar
            </button>
            {pesan && <p className="galat menu-profil__galat" role="alert">{pesan}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
