'use client'
import { useState, type FormEvent } from 'react'

export default function GantiSandi() {
  const [pesan, setPesan] = useState('')
  const [berhasil, setBerhasil] = useState(false)
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    setSibuk(true)
    setPesan('')
    setBerhasil(false)
    try {
      const r = await fetch('/api/ganti-sandi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandiLama: f.get('sandiLama'),
          sandiBaru: f.get('sandiBaru'),
          konfirmasi: f.get('konfirmasi'),
        }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        setBerhasil(true)
        form.reset()
      } else if (r.status === 401) {
        setPesan('Sesi berakhir. Silakan masuk lagi.')
      } else {
        setPesan(j?.pesan ?? 'Terjadi kesalahan. Coba lagi.')
      }
    } catch {
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
    }
    setSibuk(false)
  }

  return (
    <main>
      <h1>Ganti kata sandi</h1>
      <form onSubmit={kirim}>
        <label>Kata sandi lama<input name="sandiLama" type="password" autoComplete="current-password" required /></label>
        <label>Kata sandi baru (minimal 8 karakter)<input name="sandiBaru" type="password" autoComplete="new-password" required minLength={8} /></label>
        <label>Ulangi kata sandi baru<input name="konfirmasi" type="password" autoComplete="new-password" required /></label>
        <button type="submit" disabled={sibuk}>{sibuk ? 'Memproses…' : 'Simpan'}</button>
        {pesan && <p className="galat" role="alert">{pesan}</p>}
        {berhasil && <p className="ok" role="status">Kata sandi berhasil diganti. Perangkat lain dikeluarkan.</p>}
      </form>
      <p><a href="/dokumen">Kembali ke dokumen</a></p>
    </main>
  )
}
