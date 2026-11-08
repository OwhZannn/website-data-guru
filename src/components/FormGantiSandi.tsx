'use client'
import InputSandi from '@/components/InputSandi'
import { useTerpasang } from '@/lib/terpasang'
import { useState, type FormEvent } from 'react'

/** Formulir ganti kata sandi guru; tampil di halaman Profil. */
export default function FormGantiSandi() {
  const [pesan, setPesan] = useState('')
  const [berhasil, setBerhasil] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const terpasang = useTerpasang()

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
    <form method="post" onSubmit={kirim} className="panel profil" id="sandi" aria-labelledby="judul-sandi">
      <h2 id="judul-sandi" className="mb-s1 mt-0">Ganti kata sandi</h2>
      <p className="redup mb-s4 teks-sm">Setelah diganti, perangkat lain yang sedang masuk akan dikeluarkan.</p>
      <label>Kata sandi lama<InputSandi name="sandiLama" autoComplete="current-password" required /></label>
      <div className="profil-dua">
        <label>Kata sandi baru (minimal 8 karakter)<InputSandi name="sandiBaru" autoComplete="new-password" required minLength={8} /></label>
        <label>Ulangi kata sandi baru<InputSandi name="konfirmasi" autoComplete="new-password" required /></label>
      </div>
      <div className="aksi">
        <button type="submit" disabled={sibuk || !terpasang}>{sibuk ? 'Memproses…' : 'Simpan kata sandi'}</button>
        {berhasil && <span className="ok" role="status">Kata sandi berhasil diganti. Perangkat lain dikeluarkan.</span>}
      </div>
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </form>
  )
}
