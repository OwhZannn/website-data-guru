'use client'
import InputSandi from '@/components/InputSandi'
import PilihTema from '@/components/PilihTema'
import { useTerpasang } from '@/lib/terpasang'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Tautan from '@/components/ui/Tautan'

export default function Masuk() {
  const router = useRouter()
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const terpasang = useTerpasang()

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setSibuk(true)
    setPesan('')
    try {
      const r = await fetch('/api/auth/masuk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: f.get('username'), sandi: f.get('sandi') }),
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
    <main className="masuk">
      <div className="pojok-tema"><PilihTema ringkas /></div>
      <div className="masuk-kartu">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={92} height={82} />
      <h1>Masuk</h1>
      <p className="sub">Verval Sertifikasi Guru</p>
      <form method="post" onSubmit={kirim}>
        <label>Username
          <input name="username" autoComplete="username" required placeholder="NIP, NIK, atau email" />
          <small className="redup bantuan">Guru ASN memakai NIP, guru Non ASN memakai NIK, dan admin memakai email.</small>
        </label>
        <label>Kata sandi
          <InputSandi name="sandi" autoComplete="current-password" required placeholder="Masukkan kata sandi" />
          <small className="redup bantuan">Sandi awal 8 angka dari admin, atau sandi yang Anda buat saat daftar.</small>
        </label>
        <button type="submit" disabled={sibuk || !terpasang}>{sibuk ? 'Memproses…' : 'Masuk'}</button>
        {pesan && <p className="galat" role="alert">{pesan}</p>}
      </form>
      <p className="masuk-daftar">Belum punya akun? <Tautan href="/daftar">Buat akun guru</Tautan></p>
        <p className="sandi-lupa-panduan"><Tautan href="/panduan">Panduan penggunaan</Tautan></p>
      </div>
    </main>
  )
}
