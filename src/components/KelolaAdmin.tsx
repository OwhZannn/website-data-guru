'use client'
import { useTerpasang } from '@/lib/terpasang'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type A = { id: string; nama: string; email: string; aktif: boolean }

export default function KelolaAdmin({ admin, sayaId }: { admin: A[]; sayaId: string }) {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [pesan, setPesan] = useState('')
  const [baru, setBaru] = useState<{ email: string; sandi: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const terpasang = useTerpasang()

  async function kirim(badan: object): Promise<{ ok: boolean; sandi?: string }> {
    setSibuk(true); setPesan('')
    try {
      const r = await fetch('/api/admin/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(badan) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return { ok: false } }
      router.refresh()
      return { ok: true, sandi: j.sandi }
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
      return { ok: false }
    } finally {
      setSibuk(false)
    }
  }

  async function tambah() {
    setBaru(null)
    const h = await kirim({ aksi: 'tambah', nama, email })
    if (h.ok && h.sandi) { setBaru({ email: email.trim().toLowerCase(), sandi: h.sandi }); setNama(''); setEmail('') }
  }

  return (
    <div>
      <form method="post" onSubmit={(e) => { e.preventDefault(); void tambah() }}>
        <input name="nama" aria-label="Nama admin" value={nama} onChange={(e) => setNama(e.target.value)} />{' '}
        <input name="email" aria-label="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} />{' '}
        <button type="submit" disabled={sibuk || !terpasang}>Tambah admin</button>
      </form>
      {pesan && <p role="alert">{pesan}</p>}
      {baru && (
        <div role="status">
          <p>Sandi awal untuk {baru.email}: <code data-testid="sandi-baru">{baru.sandi}</code>{' '}
            <button onClick={() => navigator.clipboard?.writeText(baru.sandi).catch(() => {})}>Salin</button></p>
          <p><strong>Catat sekarang: sandi ini hanya tampil sekali dan tidak dapat dilihat lagi.</strong></p>
        </div>
      )}
      <table>
        <thead><tr><th>Nama</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {admin.map((a) => (
            <tr key={a.id} data-admin={a.email}>
              <td>{a.nama}</td><td>{a.email}</td><td>{a.aktif ? 'Aktif' : 'Nonaktif'}</td>
              <td>
                {a.aktif
                  ? (a.id !== sayaId && <button disabled={sibuk} onClick={() => { if (confirm(`Nonaktifkan ${a.nama}?`)) void kirim({ aksi: 'nonaktif', adminId: a.id }) }}>Nonaktifkan</button>)
                  : <button disabled={sibuk} onClick={() => kirim({ aksi: 'aktif', adminId: a.id })}>Aktifkan</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
