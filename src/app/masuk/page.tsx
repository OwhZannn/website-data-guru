'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function Masuk() {
  const router = useRouter()
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSibuk(true)
    setPesan('')
    try {
      const r = await fetch('/api/auth/masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.get('email'), sandi: f.get('sandi') }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        router.push(j.tipe === 'admin' ? '/admin' : '/dokumen')
        router.refresh()
        return
      }
      setPesan(j?.pesan ?? 'Terjadi kesalahan. Coba lagi.')
    } catch {
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
    }
    setSibuk(false)
  }

  return (
    <main>
      <h1>Masuk</h1>
      <form onSubmit={kirim}>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Kata sandi<input name="sandi" type="password" autoComplete="current-password" required /></label>
        <button type="submit" disabled={sibuk}>{sibuk ? 'Memproses…' : 'Masuk'}</button>
        {pesan && <p className="galat" role="alert">{pesan}</p>}
      </form>
    </main>
  )
}
