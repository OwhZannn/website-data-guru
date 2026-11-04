'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const BATAS = 5 * 1024 * 1024

export default function TombolUnggah({ dokumenId, teks }: { dokumenId: string; teks: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [berkas, setBerkas] = useState<File | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')
  const [bisaUlang, setBisaUlang] = useState(false)
  const [berakhir, setBerakhir] = useState(false)
  const [menyegarkan, mulaiSegar] = useTransition()
  const sibukSemua = sibuk || menyegarkan
  const kosongkan = () => { if (input.current) input.current.value = '' }

  async function kirim(f: File) {
    setSibuk(true)
    setPesan('')
    setBisaUlang(false)
    setBerakhir(false)
    try {
      const form = new FormData()
      form.set('dokumenId', dokumenId)
      form.set('berkas', f)
      const r = await fetch('/api/dokumen/unggah', { method: 'POST', body: form })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        setBerkas(null)
        kosongkan()
        mulaiSegar(() => router.refresh())
      } else if (r.status === 401) {
        setBerakhir(true)
        setBerkas(null)
        kosongkan()
      } else {
        setPesan(j?.pesan ?? 'Unggahan gagal. Coba lagi.')
        setBerkas(null)
        kosongkan()
      }
    } catch {
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
      setBisaUlang(true)
    }
    setSibuk(false)
  }

  function dipilih(f: File | undefined) {
    if (!f) return
    if (f.size > BATAS) {
      setPesan('Ukuran berkas melebihi 5 MB')
      setBisaUlang(false)
      setBerkas(null)
      kosongkan()
      return
    }
    setBerkas(f)
    void kirim(f)
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg"
        hidden
        data-testid={`berkas-${dokumenId}`}
        onChange={(e) => dipilih(e.target.files?.[0])}
      />
      <button type="button" disabled={sibukSemua} onClick={() => input.current?.click()}>
        {sibukSemua ? 'Sedang mengunggah…' : teks}
      </button>
      {bisaUlang && berkas && !sibukSemua && (
        <button type="button" className="biasa" style={{ marginLeft: 8 }} onClick={() => kirim(berkas)}>
          Coba lagi
        </button>
      )}
      {berakhir && (
        <p className="galat" role="alert">
          Sesi Anda berakhir. <a href="/masuk">Silakan masuk lagi.</a>
        </p>
      )}
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </div>
  )
}
