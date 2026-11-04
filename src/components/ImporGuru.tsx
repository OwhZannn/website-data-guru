'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Hasil = {
  dibuat: number; dilewati: number
  ditolak: { baris: number; alasan: string }[]
  sandiAwal: { nama: string; email: string; sandi: string }[]
}

const salin = (t: string) => navigator.clipboard?.writeText(t).catch(() => {})

export default function ImporGuru() {
  const router = useRouter()
  const [teks, setTeks] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [hasil, setHasil] = useState<Hasil | null>(null)

  async function kirim() {
    setSibuk(true); setPesan('')
    try {
      const r = await fetch('/api/admin/guru/impor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ teks }) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return }
      setHasil(j); setTeks('')
      router.refresh()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <section>
      <h2>Impor guru</h2>
      <p>Satu guru per baris: <code>nama;nip;email</code> atau <code>nama,nip,email</code>.</p>
      <textarea name="daftar" aria-label="Daftar guru" rows={8} cols={60} value={teks} onChange={(e) => setTeks(e.target.value)} />
      <p>
        <input type="file" aria-label="Berkas CSV atau TXT" accept=".csv,.txt,text/csv,text/plain" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setTeks(await f.text()) }} />
      </p>
      <button disabled={sibuk || !teks.trim()} onClick={kirim}>Impor</button>
      {pesan && <p role="alert">{pesan}</p>}
      {hasil && (
        <div data-testid="hasil-impor">
          <p>{hasil.dibuat} dibuat, {hasil.dilewati} dilewati, {hasil.ditolak.length} ditolak</p>
          {hasil.ditolak.length > 0 && (
            <ul>{hasil.ditolak.map((d) => <li key={d.baris}>Baris {d.baris}: {d.alasan}</li>)}</ul>
          )}
          {hasil.sandiAwal.length > 0 && (
            <>
              <p role="alert"><strong>Sandi awal hanya ditampilkan sekali ini dan tidak dapat dilihat lagi.</strong> Salin sekarang.</p>
              <button onClick={() => salin(hasil.sandiAwal.map((s) => `${s.nama}\t${s.email}\t${s.sandi}`).join('\n'))}>Salin semua</button>
              <table>
                <thead><tr><th>Nama</th><th>Email</th><th>Sandi</th><th></th></tr></thead>
                <tbody>
                  {hasil.sandiAwal.map((s) => (
                    <tr key={s.email}>
                      <td>{s.nama}</td><td>{s.email}</td><td><code>{s.sandi}</code></td>
                      <td><button onClick={() => salin(`${s.nama}\t${s.email}\t${s.sandi}`)}>Salin</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </section>
  )
}
