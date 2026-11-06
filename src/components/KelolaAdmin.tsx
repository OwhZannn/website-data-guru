'use client'
import { useTerpasang } from '@/lib/terpasang'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'

type A = { id: string; nama: string; email: string; aktif: boolean }

export default function KelolaAdmin({ admin, sayaId }: { admin: A[]; sayaId: string }) {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [pesan, setPesan] = useState('')
  const [baru, setBaru] = useState<{ email: string; sandi: string } | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [tanya, setTanya] = useState<A | null>(null)
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
      <form method="post" className="panel" onSubmit={(e) => { e.preventDefault(); void tambah() }}>
        <h2 style={{ margin: '0 0 4px' }}>Tambah admin</h2>
        <p className="redup" style={{ margin: '0 0 14px', fontSize: '.9rem' }}>Sandi awal dibuat otomatis dan ditampilkan sekali setelah admin ditambahkan.</p>
        <div className="baris-form">
          <label>Nama lengkap
            <input name="nama" aria-label="Nama admin" placeholder="Contoh: Budi Santoso" value={nama} onChange={(e) => setNama(e.target.value)} required />
          </label>
          <label>Email
            <input name="email" type="email" aria-label="Email admin" placeholder="nama@kemenag.go.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" disabled={sibuk || !terpasang}>Tambah admin</button>
        </div>
        {pesan && <p className="galat" role="alert">{pesan}</p>}
        {baru && (
          <div role="status" className="sandi-baru">
            <p style={{ margin: 0 }}>Sandi awal untuk <b>{baru.email}</b>:</p>
            <p style={{ margin: '6px 0' }}>
              <code data-testid="sandi-baru">{baru.sandi}</code>{' '}
              <button type="button" className="biasa" onClick={() => navigator.clipboard?.writeText(baru.sandi).catch(() => {})}>Salin</button>
            </p>
            <p style={{ margin: 0 }}><strong>Catat sekarang: sandi ini hanya tampil sekali dan tidak dapat dilihat lagi.</strong></p>
          </div>
        )}
      </form>
      <h2>Daftar admin ({admin.length})</h2>
      <div className="geser">
      <table>
        <thead><tr><th>Nama</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>
          {admin.map((a) => (
            <tr key={a.id} data-admin={a.email}>
              <td><b>{a.nama}</b>{a.id === sayaId && <span className="kartu-sub"> (Anda)</span>}</td><td>{a.email}</td>
              <td><span className={a.aktif ? 'lencana buka' : 'lencana'}>{a.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
              <td>
                {a.aktif
                  ? (a.id !== sayaId && <button className="garis-bahaya" disabled={sibuk} onClick={() => setTanya(a)}>Nonaktifkan</button>)
                  : <button className="garis-hijau" disabled={sibuk} onClick={() => kirim({ aksi: 'aktif', adminId: a.id })}>Aktifkan</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <Konfirmasi
        buka={tanya !== null} judul={`Nonaktifkan ${tanya?.nama ?? ''}?`} teksYa="Ya, nonaktifkan" bahaya sibuk={sibuk}
        onBatal={() => setTanya(null)}
        onYa={() => { const a = tanya; if (a) void kirim({ aksi: 'nonaktif', adminId: a.id }).then(() => setTanya(null)) }}
      >
        <p>Admin ini akan langsung keluar dan <b>tidak bisa masuk</b> sampai diaktifkan kembali. Keputusan verval yang pernah dibuatnya tetap tersimpan.</p>
      </Konfirmasi>
    </div>
  )
}
