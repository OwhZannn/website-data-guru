'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Logika keluar bersama: dipakai tombol mandiri dan butir menu profil. */
export function useKeluar() {
  const router = useRouter()
  const [pesan, setPesan] = useState('')
  async function keluar() {
    setPesan('')
    try {
      const r = await fetch('/api/auth/keluar', { method: 'POST' })
      if (!r.ok) throw new Error()
    } catch {
      setPesan('Gagal keluar. Coba lagi.')
      return
    }
    router.push('/masuk')
    router.refresh()
  }
  return { keluar, pesan }
}

export default function TombolKeluar() {
  const { keluar, pesan } = useKeluar()
  return (
    <>
      <button type="button" className="biasa" onClick={keluar}>
        Keluar
      </button>
      {pesan && <span className="galat" role="alert">{pesan}</span>}
    </>
  )
}
