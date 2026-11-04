'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TombolKeluar() {
  const router = useRouter()
  const [pesan, setPesan] = useState('')
  return (
    <>
      <button
        type="button"
        className="biasa"
        onClick={async () => {
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
        }}
      >
        Keluar
      </button>
      {pesan && <span className="galat" role="alert">{pesan}</span>}
    </>
  )
}
