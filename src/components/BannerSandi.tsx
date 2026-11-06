'use client'
import { useEffect, useRef, useState } from 'react'

export type SandiBaru = { nama: string; username: string; sandi: string }
const ACARA = 'sandi-baru'

/** Dipanggil dari baris tabel setelah sandi diatur ulang; ditampilkan oleh BannerSandi di atas halaman. */
export function umumkanSandiBaru(s: SandiBaru) {
  window.dispatchEvent(new CustomEvent<SandiBaru>(ACARA, { detail: s }))
}

/** Kotak sandi baru di bagian atas halaman daftar guru, terpisah dari baris tabel. */
export default function BannerSandi() {
  const [s, setS] = useState<SandiBaru | null>(null)
  const [tersalin, setTersalin] = useState(false)
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const dengar = (e: Event) => { setS((e as CustomEvent<SandiBaru>).detail); setTersalin(false) }
    window.addEventListener(ACARA, dengar)
    return () => window.removeEventListener(ACARA, dengar)
  }, [])
  useEffect(() => { if (s) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [s])
  if (!s) return null
  return (
    <section ref={ref} className="akun-baru" role="alert" aria-label="Sandi baru">
      <h2>Sandi baru untuk {s.nama}</h2>
      <dl>
        <dt>Username</dt><dd><code>{s.username}</code></dd>
        <dt>Kata sandi</dt>
        <dd>
          <code data-testid="sandi-baru">{s.sandi}</code>{' '}
          <button type="button" className="biasa"
            onClick={() => navigator.clipboard?.writeText(`Username: ${s.username}\nKata sandi: ${s.sandi}`).then(() => setTersalin(true)).catch(() => {})}>
            {tersalin ? 'Tersalin' : 'Salin'}
          </button>
        </dd>
      </dl>
      <p><strong>Catat sekarang: kata sandi ini hanya tampil sekali.</strong> Sandi lama sudah tidak berlaku.</p>
      <p><button type="button" className="biasa" onClick={() => setS(null)}>Tutup</button></p>
    </section>
  )
}
