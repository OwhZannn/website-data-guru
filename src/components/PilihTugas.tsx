'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useTerpasang } from '@/lib/terpasang'
import { TUGAS, type KunciTugas } from '@/lib/syarat'

/**
 * Centang tugas tambahan. Setiap perubahan langsung disimpan, lalu halaman disegarkan supaya
 * unggahan laporannya muncul atau hilang. Guru menyimpan lewat /api/tugas; admin lewat /api/admin/guru.
 */
export default function PilihTugas(p: {
  awal: Record<KunciTugas, boolean>
  guruId?: string
  terkunci?: boolean
  bukaAwal?: boolean
  varian?: 'kartu' | 'pil'
}) {
  const router = useRouter()
  const terpasang = useTerpasang()
  const [nilai, setNilai] = useState(p.awal)
  const jumlahDipilih = Object.values(nilai).filter(Boolean).length
  const dibukaAwal = p.bukaAwal ?? false
  const [sibuk, setSibuk] = useState<KunciTugas | null>(null)
  const [pesan, setPesan] = useState('')
  const admin = p.guruId !== undefined

  async function ubah(k: KunciTugas, v: boolean) {
    setSibuk(k); setPesan('')
    setNilai((n) => ({ ...n, [k]: v }))
    try {
      const tugas = { [k]: v }
      const r = await fetch(admin ? '/api/admin/guru' : '/api/tugas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin ? { aksi: 'tugas', guruId: p.guruId, tugas } : tugas),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) router.refresh()
      else {
        setNilai((n) => ({ ...n, [k]: !v }))
        setPesan(r.status === 401 ? 'Sesi berakhir. Silakan masuk lagi.' : (j?.pesan ?? 'Gagal menyimpan. Coba lagi.'))
      }
    } catch {
      setNilai((n) => ({ ...n, [k]: !v }))
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
    }
    setSibuk(null)
  }

  if (p.varian === 'pil') {
    return (
      <div className="tugas-pil-wrap" role="group" aria-labelledby="judul-tugas-pil">
        <div className="tugas-pil-judul" id="judul-tugas-pil">
          Tugas tambahan
          <span className="redup">{jumlahDipilih > 0 ? `${jumlahDipilih} dipilih` : 'Pilih yang sesuai, boleh lebih dari satu'}</span>
        </div>
        <div className="tugas-pil-daftar">
          {TUGAS.map(([k, l]) => (
            <label className="tugas-pil" key={k}>
              <input
                type="checkbox"
                className="sr-only"
                checked={nilai[k]}
                disabled={!terpasang || p.terkunci || sibuk !== null}
                onChange={(e) => void ubah(k, e.target.checked)}
              />
              {nilai[k] && <Check className="tugas-pil__ikon" size={14} strokeWidth={3} aria-hidden="true" />}
              <span>{l}</span>
            </label>
          ))}
        </div>
        {pesan && <p className="galat" role="alert">{pesan}</p>}
      </div>
    )
  }

  return (
    <details className="panel tugas" aria-label="Tugas tambahan" open={dibukaAwal}>
      <summary>
        <span className="tugas__judul">Tugas tambahan</span>
        <span className="tugas__ringkas">{jumlahDipilih > 0 ? `${jumlahDipilih} dipilih` : 'Belum ada'}</span>
      </summary>
      <p className="redup">Centang yang sesuai. Unggahan laporannya akan muncul di daftar dokumen.</p>
      <div className="tugas-daftar">
        {TUGAS.map(([k, l]) => (
          <label className="centang" key={k}>
            <input
              type="checkbox"
              checked={nilai[k]}
              disabled={!terpasang || p.terkunci || sibuk !== null}
              onChange={(e) => void ubah(k, e.target.checked)}
            />
            <span>{l}{sibuk === k && <small> menyimpan…</small>}</span>
          </label>
        ))}
      </div>
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </details>
  )
}
