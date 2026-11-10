'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type Fase = 'diam' | 'jalan' | 'selesai'

const BATAS_AMAN_MS = 10_000
const DURASI_SELESAI_MS = 400

/** Anchor internal yang memicu perpindahan rute dari klik biasa; selain itu null. */
function anchorInternal(e: MouseEvent): HTMLAnchorElement | null {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  if (!(e.target instanceof Element)) return null
  const a = e.target.closest('a')
  if (!a || !a.hasAttribute('href') || a.hasAttribute('download')) return null
  if (a.target && a.target !== '_self') return null
  let url: URL
  try { url = new URL(a.href, window.location.href) } catch { return null }
  if (url.origin !== window.location.origin) return null
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return null
  // Hash saja atau URL yang sama tidak mengubah rute, jadi tidak ada yang menyelesaikan bilah.
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null
  return a
}

function Isi() {
  const pathname = usePathname()
  const params = useSearchParams().toString()
  const [fase, setFase] = useState<Fase>('diam')
  const faseRef = useRef<Fase>('diam')
  const anchorRef = useRef<HTMLAnchorElement | null>(null)
  const batasRef = useRef<number>(0)
  const akhirRef = useRef<number>(0)

  const ubahFase = useCallback((f: Fase) => {
    faseRef.current = f
    setFase(f)
  }, [])

  const bersihkanAnchor = useCallback(() => {
    const a = anchorRef.current
    if (a) {
      a.removeAttribute('data-pindah')
      a.removeAttribute('aria-busy')
    }
    anchorRef.current = null
  }, [])

  const selesai = useCallback(() => {
    window.clearTimeout(batasRef.current)
    bersihkanAnchor()
    if (faseRef.current !== 'jalan') return
    ubahFase('selesai')
    window.clearTimeout(akhirRef.current)
    akhirRef.current = window.setTimeout(() => ubahFase('diam'), DURASI_SELESAI_MS)
  }, [bersihkanAnchor, ubahFase])

  useEffect(() => {
    function mulai(e: MouseEvent) {
      const a = anchorInternal(e)
      if (!a) return
      bersihkanAnchor()
      anchorRef.current = a
      a.setAttribute('data-pindah', '')
      a.setAttribute('aria-busy', 'true')
      window.clearTimeout(akhirRef.current)
      window.clearTimeout(batasRef.current)
      batasRef.current = window.setTimeout(selesai, BATAS_AMAN_MS)
      ubahFase('jalan')
    }
    document.addEventListener('click', mulai)
    return () => {
      document.removeEventListener('click', mulai)
      window.clearTimeout(batasRef.current)
      window.clearTimeout(akhirRef.current)
      bersihkanAnchor()
    }
  }, [bersihkanAnchor, selesai, ubahFase])

  // Rute baru sudah dirender: path atau query berubah.
  useEffect(() => { selesai() }, [pathname, params, selesai])

  return <div className="bilah-navigasi" data-fase={fase} aria-hidden="true" />
}

/** Bilah tipis 3px di atas layar selama perpindahan rute internal. Disembunyikan dari pembaca layar. */
export default function BilahNavigasi() {
  return (
    <Suspense fallback={null}>
      <Isi />
    </Suspense>
  )
}
