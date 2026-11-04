'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type P = { id: string; nama: string; dibuka: boolean }

export default function KelolaPeriode({ periode }: { periode: P[] }) {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [sumber, setSumber] = useState<Record<string, string>>({})

  async function kirim(badan: object, sukses?: (j: { jumlah?: number }) => string) {
    setSibuk(true); setPesan('')
    try {
      const r = await fetch('/api/admin/periode', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(badan) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return }
      if (sukses) setPesan(sukses(j))
      router.refresh()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); void kirim({ aksi: 'buat', nama }).then(() => setNama('')) }}>
        <input name="nama" aria-label="Nama periode" value={nama} onChange={(e) => setNama(e.target.value)} />{' '}
        <button type="submit" disabled={sibuk}>Buat periode</button>
      </form>
      {pesan && <p role="status">{pesan}</p>}
      <ul>
        {periode.map((p) => (
          <li key={p.id} data-periode={p.nama}>
            <strong>{p.nama}</strong> <span className="lencana">{p.dibuka ? 'Dibuka' : 'Ditutup'}</span>{' '}
            <a href={`/api/admin/rekap?periodeId=${p.id}&format=csv`}>Rekap CSV</a>{' '}<a href={`/api/admin/rekap?periodeId=${p.id}&format=xlsx`}>Rekap XLSX</a>{' '}
            {p.dibuka
              ? <button disabled={sibuk} onClick={() => kirim({ aksi: 'tutup', periodeId: p.id })}>Tutup</button>
              : <button disabled={sibuk} onClick={() => kirim({ aksi: 'buka', periodeId: p.id })}>Buka</button>}{' '}
            <a href={`/admin/periode/${p.id}/dokumen`}>Daftar dokumen</a>{' '}
            {periode.length > 1 && (
              <span>
                <select aria-label={`Sumber salinan untuk ${p.nama}`} value={sumber[p.id] ?? ''} onChange={(e) => setSumber({ ...sumber, [p.id]: e.target.value })}>
                  <option value="">Salin dokumen dari periode lain...</option>
                  {periode.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
                </select>{' '}
                <button disabled={sibuk || !sumber[p.id]} onClick={() => kirim({ aksi: 'salin', dariPeriodeId: sumber[p.id], kePeriodeId: p.id }, (j) => `${j.jumlah} dokumen disalin ke ${p.nama}`)}>Salin</button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
