'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'

type P = { id: string; nama: string; dibuka: boolean }

export default function KelolaPeriode({ periode }: { periode: P[] }) {
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [sumber, setSumber] = useState<Record<string, string>>({})
  const [tutup, setTutup] = useState<P | null>(null)

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
      <form className="panel" onSubmit={(e) => { e.preventDefault(); void kirim({ aksi: 'buat', nama }).then(() => setNama('')) }}>
        <h2 className="mb-s3 mt-0">Buat periode baru</h2>
        <div className="baris-form">
          <label>Nama periode
            <input name="nama" aria-label="Nama periode" placeholder="Contoh: Verval Sertifikasi 2027" value={nama} onChange={(e) => setNama(e.target.value)} />
          </label>
          <button type="submit" disabled={sibuk}>Buat periode</button>
        </div>
      </form>
      {pesan && <p role="status" className="info">{pesan}</p>}
      <h2>Daftar periode ({periode.length})</h2>
      <ul className="daftar-periode">
        {periode.map((p) => (
          <li key={p.id} data-periode={p.nama} className={p.dibuka ? 'dibuka' : undefined}>
            <div className="periode-atas">
              <div>
                <strong>{p.nama}</strong> <span className={p.dibuka ? 'lencana buka' : 'lencana'}>{p.dibuka ? 'Dibuka' : 'Ditutup'}</span>
                <p className="kartu-sub mt-s1">
                  {p.dibuka ? 'Guru sedang bisa mengunggah dokumen.' : 'Guru tidak bisa mengunggah. Admin tetap bisa memeriksa.'}
                </p>
              </div>
              {p.dibuka
                ? <button className="garis-bahaya" disabled={sibuk} onClick={() => setTutup(p)}>Tutup periode</button>
                : <button disabled={sibuk} onClick={() => kirim({ aksi: 'buka', periodeId: p.id })}>Buka</button>}
            </div>
            <div className="periode-aksi">
              <a className="tombol-garis" href={`/admin/periode/${p.id}/dokumen`}>Daftar dokumen</a>
              <a className="tombol-garis" href={`/api/admin/rekap?periodeId=${p.id}&format=xlsx`}>Rekap XLSX</a>
              <a className="tombol-garis" href={`/api/admin/rekap?periodeId=${p.id}&format=csv`}>Rekap CSV</a>
              {periode.length > 1 && (
                <span className="periode-salin">
                  <select aria-label={`Sumber salinan untuk ${p.nama}`} value={sumber[p.id] ?? ''} onChange={(e) => setSumber({ ...sumber, [p.id]: e.target.value })}>
                    <option value="">Salin dokumen dari periode lain…</option>
                    {periode.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
                  </select>
                  <button className="biasa" disabled={sibuk || !sumber[p.id]} onClick={() => kirim({ aksi: 'salin', dariPeriodeId: sumber[p.id], kePeriodeId: p.id }, (j) => `${j.jumlah} dokumen disalin ke ${p.nama}`)}>Salin</button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Konfirmasi
        buka={tutup !== null} judul={`Tutup ${tutup?.nama ?? ''}?`} teksYa="Ya, tutup periode" bahaya sibuk={sibuk}
        onBatal={() => setTutup(null)}
        onYa={() => { const p = tutup; if (p) void kirim({ aksi: 'tutup', periodeId: p.id }).then(() => setTutup(null)) }}
      >
        <p>Setelah ditutup, <b>guru tidak bisa lagi mengunggah atau mengganti berkas</b> pada periode ini, dan tombol unggah hilang dari halaman mereka.</p>
        <p>Admin tetap bisa memeriksa, mengesahkan, menolak, dan mengunduh rekap. Periode bisa dibuka lagi kapan saja.</p>
      </Konfirmasi>
    </div>
  )
}
