'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Hasil = {
  dibuat: number; dilewati: number
  ditolak: { baris: number; alasan: string }[]
  sandiAwal: { nama: string; username: string; sandi: string }[]
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
      <p className="mt-0">
        Satu guru per baris dengan urutan <code>Nama;NIP;NIK;Status Kepegawaian;Tahun Sertifikasi</code>
        (pemisah titik koma atau koma). Bisa ditempel langsung dari Excel yang disimpan sebagai CSV.
      </p>
      <ul className="redup daftar-impor">
        <li>Status: <b>PNS</b>, <b>PPPK</b>, <b>Paruh waktu</b>, atau <b>Non ASN</b>.</li>
        <li>PNS, PPPK, dan Paruh waktu wajib NIP (18 angka) dan masuk dengan NIP. Non ASN wajib NIK (16 angka) dan masuk dengan NIK.</li>
        <li>Kolom yang tidak dipakai boleh dikosongkan, misalnya NIK untuk PNS. Guru yang NIP/NIK-nya sudah terdaftar dilewati.</li>
        <li>Setiap guru mendapat kata sandi awal 8 angka acak.</li>
      </ul>
      <pre className="contoh-impor">{`Nama;NIP;NIK;Status Kepegawaian;Tahun Sertifikasi
Siti Rahmawati, S.Pd.I.;198701012010012001;;PNS;2014
Ahmad Fauzi;198502022023211002;;PPPK;2019
Nur Hasanah;;5201014507900001;Non ASN;2021`}</pre>
      <textarea name="daftar" aria-label="Daftar guru" rows={8} cols={60} value={teks} onChange={(e) => setTeks(e.target.value)}
        placeholder="Tempel daftar guru di sini" />
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
              <button onClick={() => salin(hasil.sandiAwal.map((s) => `${s.nama}\t${s.username}\t${s.sandi}`).join('\n'))}>Salin semua</button>
              <div className="geser"><table>
                <thead><tr><th>Nama</th><th>Username (NIP/NIK)</th><th>Sandi</th><th></th></tr></thead>
                <tbody>
                  {hasil.sandiAwal.map((s) => (
                    <tr key={s.username}>
                      <td>{s.nama}</td><td>{s.username}</td><td><code>{s.sandi}</code></td>
                      <td><button onClick={() => salin(`${s.nama}\t${s.username}\t${s.sandi}`)}>Salin</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
