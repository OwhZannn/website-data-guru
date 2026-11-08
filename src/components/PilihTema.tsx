'use client'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { PILIHAN_TEMA, bacaTema, pasangTema, type Tema } from '@/lib/tema'

const IKON = { terang: Sun, gelap: Moon, sistem: Monitor } as const

/** Kontrol segmen Terang / Gelap / Sistem. `dalamMenu` memakai peran menuitemradio untuk menu profil. */
export function useTema() {
  // Awal "sistem" agar HTML server dan klien sama; pilihan tersimpan dibaca setelah terpasang.
  const [tema, setTema] = useState<Tema>('sistem')
  useEffect(() => { setTema(bacaTema()) }, [])
  function pilih(t: Tema) {
    pasangTema(t)
    setTema(t)
  }
  return { tema, pilih }
}

export default function PilihTema({ dalamMenu = false, ringkas = false }: { dalamMenu?: boolean; ringkas?: boolean }) {
  const { tema, pilih } = useTema()

  // Di luar menu: grup radio dengan tombol panah (roving tabindex).
  function tekan(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (dalamMenu) return
    const arah = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!arah) return
    e.preventDefault()
    const j = (i + arah + PILIHAN_TEMA.length) % PILIHAN_TEMA.length
    pilih(PILIHAN_TEMA[j].nilai)
    const tombol = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
    tombol?.[j]?.focus()
  }

  return (
    <div
      className={`segmen-tema${ringkas ? ' segmen-tema--ringkas' : ''}`}
      role={dalamMenu ? 'group' : 'radiogroup'}
      aria-label="Tema tampilan"
    >
      {PILIHAN_TEMA.map((p, i) => {
        const Ikon = IKON[p.nilai]
        const aktif = tema === p.nilai
        return (
          <button
            key={p.nilai}
            type="button"
            role={dalamMenu ? 'menuitemradio' : 'radio'}
            aria-checked={aktif}
            tabIndex={dalamMenu ? -1 : aktif ? 0 : -1}
            className={`segmen-tema__butir${aktif ? ' aktif' : ''}`}
            data-tema-pilihan={p.nilai}
            onClick={() => pilih(p.nilai)}
            onKeyDown={(e) => tekan(e, i)}
          >
            <Ikon size={14} strokeWidth={2} aria-hidden="true" />
            <span>{p.teks}</span>
          </button>
        )
      })}
    </div>
  )
}
