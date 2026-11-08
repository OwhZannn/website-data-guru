'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Mode = null | 'tolak' | 'batalkan'

type Props = {
  dokumenGuruId: string
  status: string
  /** Daftar teks preset alasan penolakan (dari DB / fallback). */
  alasanPreset?: string[]
  /** Callback opsional setelah keputusan berhasil (untuk auto-advance). */
  onBerhasil?: () => void
}

export default function TombolKeputusan({ dokumenGuruId, status, alasanPreset = [], onBerhasil }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [alasan, setAlasan] = useState('')
  const [statusBaru, setStatusBaru] = useState(status === 'SAH' ? 'DITOLAK' : 'SAH')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(isi: Record<string, string>) {
    setPesan('')
    setSibuk(true)
    try {
      const r = await fetch('/api/admin/keputusan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dokumenGuruId, ...isi }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) {
        setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.')
        return
      }
      setMode(null)
      setAlasan('')
      if (onBerhasil) onBerhasil()
      else router.refresh()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
    } finally {
      setSibuk(false)
    }
  }

  function pakaiPreset(teks: string) {
    setAlasan((sebelum) => {
      const bersih = sebelum.trim()
      return bersih ? `${bersih}. ${teks}` : teks
    })
  }

  const menunggu = status === 'MENUNGGU'
  const sudahDiputuskan = status === 'SAH' || status === 'DITOLAK'
  if (!menunggu && !sudahDiputuskan) return null

  return (
    <div>
      {mode === null && (
        <div className="aksi">
          {menunggu && (
            <>
              <button type="button" disabled={sibuk} onClick={() => kirim({ aksi: 'sahkan' })}>Sahkan</button>
              <button type="button" className="bahaya" disabled={sibuk} onClick={() => setMode('tolak')}>Tolak</button>
            </>
          )}
          {sudahDiputuskan && (
            <button type="button" className="biasa" disabled={sibuk} onClick={() => setMode('batalkan')}>Batalkan keputusan</button>
          )}
        </div>
      )}
      {mode !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            kirim(mode === 'tolak' ? { aksi: 'tolak', alasan } : { aksi: 'batalkan', alasan, statusBaru })
          }}
        >
          {mode === 'tolak' && alasanPreset.length > 0 && (
            <div className="chip-alasan-wrap" aria-label="Preset alasan">
              {alasanPreset.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="chip-alasan"
                  disabled={sibuk}
                  onClick={() => pakaiPreset(p)}
                  data-testid="chip-alasan"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <label>
            {mode === 'tolak' ? 'Alasan penolakan' : 'Alasan pembatalan'}
            <textarea
              name="alasan"
              rows={3}
              maxLength={1000}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              aria-label={mode === 'tolak' ? 'Alasan penolakan' : 'Alasan pembatalan'}
            />
          </label>
          {mode === 'batalkan' && (
            <label>
              Status baru
              <select name="statusBaru" value={statusBaru} onChange={(e) => setStatusBaru(e.target.value)}>
                <option value="SAH">SAH</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </label>
          )}
          <div className="aksi">
            <button type="submit" disabled={sibuk}>{mode === 'tolak' ? 'Kirim penolakan' : 'Simpan pembatalan'}</button>
            <button type="button" className="biasa" disabled={sibuk} onClick={() => { setMode(null); setPesan(''); setAlasan('') }}>Batal</button>
          </div>
        </form>
      )}
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </div>
  )
}
