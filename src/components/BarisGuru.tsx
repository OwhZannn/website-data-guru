'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type G = { id: string; nama: string; nip: string; email: string; aktif: boolean }
type S = { progres: string; label: string }

export default function BarisGuru({ guru, status }: { guru: G; status?: S }) {
  const router = useRouter()
  const [pesan, setPesan] = useState('')
  const [sandi, setSandi] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(badan: object) {
    setSibuk(true); setPesan('')
    try {
      const r = await fetch('/api/admin/guru', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(badan) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return }
      if (j.sandi) setSandi(j.sandi)
      router.refresh()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <tr>
      <td><a href={`/admin/guru/${guru.id}`}>{guru.nama}</a></td><td>{guru.nip}</td><td>{guru.email}</td>
      {status && <><td>{status.progres}</td><td>{status.label}</td></>}
      <td>{guru.aktif ? 'Aktif' : 'Nonaktif'}</td>
      <td>
        <button disabled={sibuk} onClick={() => kirim({ aksi: 'aktif', guruId: guru.id, aktif: !guru.aktif })}>
          {guru.aktif ? 'Nonaktifkan' : 'Aktifkan'}
        </button>{' '}
        <button disabled={sibuk} onClick={() => { if (confirm(`Atur ulang sandi ${guru.nama}?`)) void kirim({ aksi: 'atur_ulang_sandi', guruId: guru.id }) }}>Atur ulang sandi</button>
        {sandi && (
          <div role="alert">
            Sandi baru: <code>{sandi}</code> (hanya tampil sekali){' '}
            <button onClick={() => navigator.clipboard?.writeText(sandi).catch(() => {})}>Salin</button>
          </div>
        )}
        {pesan && <div role="alert">{pesan}</div>}
      </td>
    </tr>
  )
}
