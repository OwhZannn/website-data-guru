'use client'
import { MessageSquareX } from 'lucide-react'
import EmptyState from './ui/EmptyState'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AlasanTolak } from '@prisma/client'

export default function KelolaAlasan({ baris }: { baris: AlasanTolak[] }) {
  const router = useRouter()
  const [teks, setTeks] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [edit, setEdit] = useState<{ id: string; teks: string } | null>(null)

  async function kirim(badan: object): Promise<boolean> {
    setSibuk(true)
    setPesan('')
    try {
      const r = await fetch('/api/admin/alasan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(badan),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) {
        setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.')
        return false
      }
      router.refresh()
      return true
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
      return false
    } finally {
      setSibuk(false)
    }
  }

  async function tambah(e: React.FormEvent) {
    e.preventDefault()
    if (!teks.trim()) return
    const ok = await kirim({ aksi: 'tambah', teks: teks.trim() })
    if (ok) setTeks('')
  }

  async function simpanEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!edit || !edit.teks.trim()) return
    const ok = await kirim({ aksi: 'ubah', id: edit.id, teks: edit.teks.trim() })
    if (ok) setEdit(null)
  }

  return (
    <div>
      {/* Form tambah */}
      <form onSubmit={tambah} style={{ display: 'flex', gap: 'var(--s-2)', marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder="Teks alasan baru…"
          maxLength={200}
          style={{ flex: 1, minWidth: 200, margin: 0 }}
          aria-label="Teks alasan baru"
        />
        <button type="submit" disabled={sibuk || !teks.trim()}>Tambah</button>
      </form>
      {pesan && <p className="galat mb-s3">{pesan}</p>}

      {baris.length === 0 && (
        <EmptyState ikon={<MessageSquareX size={28} />} teks="Belum ada alasan penolakan. Tambahkan di atas." />
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {baris.map((a, idx) => (
          <li key={a.id} className="kartu" style={{ opacity: a.aktif ? 1 : 0.55 }}>
            {edit?.id === a.id ? (
              <form onSubmit={simpanEdit} style={{ display: 'flex', gap: 'var(--s-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={edit.teks}
                  onChange={(e) => setEdit({ ...edit, teks: e.target.value })}
                  maxLength={200}
                  style={{ flex: 1, minWidth: 160, margin: 0 }}
                  aria-label="Edit teks alasan"
                  autoFocus
                />
                <button type="submit" disabled={sibuk || !edit.teks.trim()}>Simpan</button>
                <button type="button" className="biasa" disabled={sibuk} onClick={() => setEdit(null)}>Batal</button>
              </form>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--s-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>
                  {a.teks}
                  {!a.aktif && <span className="label BELUM" style={{ marginLeft: 'var(--s-2)' }}>Nonaktif</span>}
                </span>
                <div style={{ display: 'flex', gap: 'var(--s-1)', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="biasa"
                    disabled={sibuk || idx === 0}
                    onClick={() => kirim({ aksi: 'urut', id: a.id, arah: 'naik' })}
                    aria-label="Pindah ke atas"
                    title="Naik"
                  >↑</button>
                  <button
                    type="button"
                    className="biasa"
                    disabled={sibuk || idx === baris.length - 1}
                    onClick={() => kirim({ aksi: 'urut', id: a.id, arah: 'turun' })}
                    aria-label="Pindah ke bawah"
                    title="Turun"
                  >↓</button>
                  <button
                    type="button"
                    className="biasa"
                    disabled={sibuk}
                    onClick={() => setEdit({ id: a.id, teks: a.teks })}
                  >Ubah</button>
                  {a.aktif ? (
                    <button
                      type="button"
                      className="biasa"
                      disabled={sibuk}
                      onClick={() => kirim({ aksi: 'nonaktifkan', id: a.id })}
                      data-testid={`nonaktifkan-${a.id}`}
                    >Nonaktifkan</button>
                  ) : (
                    <button
                      type="button"
                      disabled={sibuk}
                      onClick={() => kirim({ aksi: 'aktifkan', id: a.id })}
                    >Aktifkan</button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
