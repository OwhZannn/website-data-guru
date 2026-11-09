'use client'
import { useTerpasang } from '@/lib/terpasang'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'
import DataTable, { type Kolom } from './ui/DataTable'
import PageHeader from './ui/PageHeader'
import EmptyState from './ui/EmptyState'
import { UserX } from 'lucide-react'

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

  const kolom: Kolom<A>[] = [
    {
      id: 'nama', label: 'Nama', tanpaLabelPonsel: true,
      sel: (a) => <><b>{a.nama}</b>{a.id === sayaId && <span className="kartu-sub"> (Anda)</span>}</>,
    },
    { id: 'email', label: 'Email', sel: (a) => a.email },
    { id: 'status', label: 'Status', sel: (a) => <span className={a.aktif ? 'lencana buka' : 'lencana'}>{a.aktif ? 'Aktif' : 'Nonaktif'}</span> },
    {
      id: 'aksi', label: 'Aksi', tanpaLabelPonsel: true, kelas: 'nowrap',
      sel: (a) => a.aktif
        ? (a.id !== sayaId && <button className="garis-bahaya" disabled={sibuk} onClick={() => setTanya(a)}>Nonaktifkan</button>)
        : <button className="garis-hijau" disabled={sibuk} onClick={() => kirim({ aksi: 'aktif', adminId: a.id })}>Aktifkan</button>,
    },
  ]

  return (
    <>
      <PageHeader
        judul="Admin"
        keterangan="Sandi awal dibuat otomatis, tampil sekali"
        aksi={(
          <form method="post" className="form-inline" onSubmit={(e) => { e.preventDefault(); void tambah() }}>
            <input name="nama" aria-label="Nama admin" placeholder="Nama lengkap" value={nama} onChange={(e) => setNama(e.target.value)} required />
            <input name="email" type="email" aria-label="Email admin" placeholder="nama@kemenag.go.id" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button type="submit" disabled={sibuk || !terpasang}>Tambah admin</button>
          </form>
        )}
      />
      {pesan && <p className="galat" role="alert">{pesan}</p>}
      {baru && (
        <div role="status" className="sandi-baru">
          <p className="mb-0">Sandi awal untuk <b>{baru.email}</b>:</p>
          <p className="sandi-baru-baris">
            <code data-testid="sandi-baru">{baru.sandi}</code>{' '}
            <button type="button" className="biasa" onClick={() => navigator.clipboard?.writeText(baru.sandi).catch(() => {})}>Salin</button>
          </p>
          <p className="mb-0"><strong>Catat sekarang: sandi ini hanya tampil sekali dan tidak dapat dilihat lagi.</strong></p>
        </div>
      )}
      <DataTable
        keterangan="Daftar admin" judul={`Daftar admin (${admin.length})`}
        kolom={kolom} baris={admin} kunciBaris={(a) => a.id}
        atributBaris={(a) => ({ 'data-admin': a.email })}
        jumlahTeks={`${admin.length} admin`}
        kosong={<EmptyState ikon={<UserX size={28} />} teks="Belum ada admin." />}
      />
      <Konfirmasi
        buka={tanya !== null} judul={`Nonaktifkan ${tanya?.nama ?? ''}?`} teksYa="Ya, nonaktifkan" bahaya sibuk={sibuk}
        onBatal={() => setTanya(null)}
        onYa={() => { const a = tanya; if (a) void kirim({ aksi: 'nonaktif', adminId: a.id }).then(() => setTanya(null)) }}
      >
        <p>Admin ini akan langsung keluar dan <b>tidak bisa masuk</b> sampai diaktifkan kembali. Keputusan verval yang pernah dibuatnya tetap tersimpan.</p>
      </Konfirmasi>
    </>
  )
}
