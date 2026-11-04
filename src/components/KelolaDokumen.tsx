'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Dok = { id: string; nama: string; urutan: number }

export default function KelolaDokumen({ periodeId, aktif, nonaktif }: { periodeId: string; aktif: Dok[]; nonaktif: Dok[] }) {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  // Peringatan menunggu konfirmasi: aksi yang tertunda beserta jumlah guru terdampak.
  const [tunda, setTunda] = useState<null | { jumlah: number; jalan: () => Promise<void> }>(null)
  const [edit, setEdit] = useState<null | { id: string; nama: string }>(null)

  async function kirim(badan: object): Promise<boolean> {
    setSibuk(true); setPesan('')
    try {
      const r = await fetch('/api/admin/dokumen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(badan) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return false }
      router.refresh()
      return true
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
      return false
    } finally {
      setSibuk(false)
    }
  }

  // Tanya dampak dulu; bila > 0 tampilkan peringatan, bila 0 langsung jalan.
  async function denganPeringatan(dokumenId: string | undefined, jalan: () => Promise<void>) {
    setSibuk(true); setPesan('')
    try {
      const q = new URLSearchParams({ periodeId, ...(dokumenId ? { dokumenId } : {}) })
      const r = await fetch(`/api/admin/dokumen?${q}`)
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return }
      if (j.dampak > 0) setTunda({ jumlah: j.dampak, jalan })
      else await jalan()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
    } finally {
      setSibuk(false)
    }
  }

  const tambah = () => denganPeringatan(undefined, async () => {
    if (await kirim({ aksi: 'tambah', periodeId, nama })) setNama('')
  })

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); void tambah() }}>
        <label>Nama dokumen baru<input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={200} /></label>
        <button type="submit" disabled={sibuk}>Tambah dokumen</button>
      </form>

      {tunda && (
        <div role="alertdialog" aria-label="Peringatan" className="kartu">
          <p>Menambah dokumen ini akan membuat {tunda.jumlah} guru yang sudah lengkap kembali berstatus belum lengkap. Lanjutkan?</p>
          <button type="button" disabled={sibuk} onClick={async () => { const t = tunda; setTunda(null); await t.jalan() }}>Lanjutkan</button>{' '}
          <button type="button" className="biasa" onClick={() => setTunda(null)}>Batal</button>
        </div>
      )}
      {pesan && <p className="galat" role="alert">{pesan}</p>}

      <h2>Dokumen aktif</h2>
      {aktif.length === 0 ? <p>Belum ada dokumen aktif.</p> : (
        <ol>
          {aktif.map((d, i) => (
            <li key={d.id} aria-label={d.nama}>
              {edit?.id === d.id ? (
                <>
                  <input aria-label="Nama baru" value={edit.nama} maxLength={200} onChange={(e) => setEdit({ id: d.id, nama: e.target.value })} />{' '}
                  <button type="button" disabled={sibuk} onClick={async () => { if (await kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, nama: edit.nama })) setEdit(null) }}>Simpan</button>{' '}
                  <button type="button" className="biasa" onClick={() => setEdit(null)}>Batal ubah</button>
                </>
              ) : (
                <>
                  <strong>{d.nama}</strong>{' '}
                  <button type="button" className="biasa" disabled={sibuk || i === 0} aria-label={`Naikkan ${d.nama}`}
                    onClick={() => kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, arah: 'naik' })}>↑</button>
                  <button type="button" className="biasa" disabled={sibuk || i === aktif.length - 1} aria-label={`Turunkan ${d.nama}`}
                    onClick={() => kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, arah: 'turun' })}>↓</button>{' '}
                  <button type="button" className="biasa" onClick={() => setEdit({ id: d.id, nama: d.nama })}>Ubah nama</button>{' '}
                  <button type="button" className="biasa" disabled={sibuk} onClick={() => kirim({ aksi: 'nonaktifkan', periodeId, dokumenId: d.id })}>
                    Nonaktifkan
                  </button>
                  <br /><small>Dokumen disembunyikan dari guru, bukan dihapus. Berkas yang sudah diunggah tetap tersimpan.</small>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {nonaktif.length > 0 && (
        <>
          <h2>Dokumen nonaktif</h2>
          <ul>
            {nonaktif.map((d) => (
              <li key={d.id} style={{ opacity: 0.55 }}>
                {d.nama}{' '}
                <button type="button" className="biasa" disabled={sibuk}
                  onClick={() => denganPeringatan(d.id, async () => { await kirim({ aksi: 'aktifkan', periodeId, dokumenId: d.id }) })}>
                  Aktifkan kembali
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
