'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { kecilkanGambar } from '@/lib/kecilkanGambar'
import { BATAS_UKURAN, TEKS_BATAS } from '@/lib/periksaBerkas'
import Tautan from '@/components/ui/Tautan'

export default function TombolUnggah({ dokumenId, teks }: { dokumenId: string; teks: string }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [berkas, setBerkas] = useState<File | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [menyiapkan, setMenyiapkan] = useState(false)
  const [pesan, setPesan] = useState('')
  const [bisaUlang, setBisaUlang] = useState(false)
  const [berakhir, setBerakhir] = useState(false)
  const [persen, setPersen] = useState<number | null>(null)
  const [seretAktif, setSeretAktif] = useState(false)
  const [menyegarkan, mulaiSegar] = useTransition()
  const sibukSemua = sibuk || menyegarkan || menyiapkan
  const kosongkan = () => { if (input.current) input.current.value = '' }

  function kirim(f: File): Promise<void> {
    return new Promise((selesai) => {
      setSibuk(true)
      setPesan('')
      setBisaUlang(false)
      setBerakhir(false)
      setPersen(0)

      const form = new FormData()
      form.set('dokumenId', dokumenId)
      form.set('berkas', f)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/dokumen/unggah')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setPersen(Math.round((e.loaded / e.total) * 100))
      }

      xhr.onload = () => {
        setPersen(null)
        let j: { ok?: boolean; pesan?: string } | null = null
        try { j = JSON.parse(xhr.responseText) } catch { /* abaikan */ }
        if (xhr.status === 200 && j?.ok) {
          setBerkas(null)
          kosongkan()
          mulaiSegar(() => router.refresh())
        } else if (xhr.status === 401) {
          setBerakhir(true)
          setBerkas(null)
          kosongkan()
        } else {
          setPesan(j?.pesan ?? 'Unggahan gagal. Coba lagi.')
          setBerkas(null)
          kosongkan()
        }
        setSibuk(false)
        selesai()
      }

      xhr.onerror = () => {
        setPersen(null)
        setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
        setBisaUlang(true)
        setSibuk(false)
        selesai()
      }

      xhr.send(form)
    })
  }

  async function dipilih(asli: File | undefined) {
    if (!asli) return
    setMenyiapkan(true)
    setPesan('')
    setBisaUlang(false)
    const f = await kecilkanGambar(asli)
    setMenyiapkan(false)
    if (f.size > BATAS_UKURAN) {
      setPesan(`Ukuran berkas melebihi ${TEKS_BATAS}. Perkecil atau pindai ulang dengan resolusi lebih rendah.`)
      setBisaUlang(false)
      setBerkas(null)
      kosongkan()
      return
    }
    setBerkas(f)
    void kirim(f)
  }

  function seretMasuk(e: React.DragEvent) {
    e.preventDefault()
    setSeretAktif(true)
  }
  function seretKeluar(e: React.DragEvent) {
    e.preventDefault()
    setSeretAktif(false)
  }
  function lepaskan(e: React.DragEvent) {
    e.preventDefault()
    setSeretAktif(false)
    if (!sibukSemua) void dipilih(e.dataTransfer.files?.[0])
  }

  return (
    <div
      className={`aksi zona-unggah${seretAktif ? ' zona-unggah--aktif' : ''}`}
      data-testid={`zona-unggah-${dokumenId}`}
      onDragOver={seretMasuk}
      onDragEnter={seretMasuk}
      onDragLeave={seretKeluar}
      onDrop={lepaskan}
    >
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg"
        hidden
        data-testid={`berkas-${dokumenId}`}
        onChange={(e) => void dipilih(e.target.files?.[0])}
      />
      <button type="button" disabled={sibukSemua} onClick={() => input.current?.click()}>
        {menyiapkan ? 'Menyiapkan berkas…' : sibuk ? 'Sedang mengunggah…' : menyegarkan ? 'Memuat ulang…' : teks}
      </button>
      {!sibukSemua && (
        <span className="kartu-sub">
          PDF atau JPG, maks. {TEKS_BATAS} · seret berkas ke sini atau klik tombol
        </span>
      )}
      {persen !== null && (
        <span className="kartu-sub" data-testid="progres-unggah" aria-live="polite">
          Mengunggah… {persen}%
        </span>
      )}
      {bisaUlang && berkas && !sibukSemua && (
        <button type="button" className="biasa" onClick={() => void kirim(berkas)}>
          Coba lagi
        </button>
      )}
      {berakhir && (
        <p className="galat" role="alert">
          Sesi Anda berakhir. <Tautan href="/masuk">Silakan masuk lagi.</Tautan>
        </p>
      )}
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </div>
  )
}
