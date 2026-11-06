'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Dialog peringatan sebelum aksi yang berdampak (menonaktifkan guru, menutup periode, dll.).
 * Dirender di halaman, bukan confirm() bawaan peramban, supaya isinya bisa menjelaskan akibatnya.
 */
export default function Konfirmasi(p: {
  buka: boolean
  judul: string
  children: ReactNode
  teksYa: string
  bahaya?: boolean
  sibuk?: boolean
  onYa: () => void
  onBatal: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (p.buka && !d.open) d.showModal()
    if (!p.buka && d.open) d.close()
  }, [p.buka])

  return (
    <dialog ref={ref} className="konfirmasi" aria-labelledby="judul-konfirmasi" onCancel={(e) => { e.preventDefault(); p.onBatal() }}>
      {p.buka && (
        <>
          <div className={p.bahaya ? 'konfirmasi-ikon bahaya' : 'konfirmasi-ikon'} aria-hidden="true">!</div>
          <h2 id="judul-konfirmasi">{p.judul}</h2>
          <div className="konfirmasi-isi">{p.children}</div>
          <div className="konfirmasi-aksi">
            <button type="button" className="biasa" onClick={p.onBatal} disabled={p.sibuk} autoFocus>Batal</button>
            <button type="button" className={p.bahaya ? 'bahaya' : undefined} onClick={p.onYa} disabled={p.sibuk}>
              {p.sibuk ? 'Memproses…' : p.teksYa}
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
