'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'
import { umumkanSandiBaru } from './BannerSandi'

type G = { id: string; nama: string; username: string; aktif: boolean; disetujui: boolean; keterangan?: string }
type S = { progres: string; label: string }
type Tanya = 'nonaktif' | 'sandi' | 'tolak'

export default function BarisGuru({ guru, status }: { guru: G; status?: S }) {
  const router = useRouter()
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [tanya, setTanya] = useState<Tanya | null>(null)

  async function kirim(badan: object) {
    setSibuk(true); setPesan('')
    try {
      const r = await fetch('/api/admin/guru', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(badan) })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) { setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.'); return }
      if (j.sandi) umumkanSandiBaru({ nama: guru.nama, username: j.username ?? guru.username, sandi: j.sandi })
      router.refresh()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
    } finally {
      setSibuk(false)
      setTanya(null)
    }
  }

  return (
    <tr className={guru.disetujui ? undefined : 'baris-menunggu'}>
      <td>
        <a href={`/admin/guru/${guru.id}`}><b>{guru.nama}</b></a>
        {guru.keterangan && <div className="kartu-sub">{guru.keterangan}</div>}
      </td>
      <td>{guru.username}</td>
      {status && (
        <>
          <td>{guru.disetujui ? status.progres : '-'}</td>
          <td>
            {!guru.disetujui || status.label === '-' ? '-'
              : <span className={`label ${status.label.replace(/ /g, '-')}`}>{status.label}</span>}
          </td>
        </>
      )}
      <td>
        {!guru.disetujui ? <span className="label Perlu-dicek">Menunggu persetujuan</span>
          : guru.aktif ? 'Aktif' : <strong className="galat">Nonaktif</strong>}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        {!guru.disetujui ? (
          <>
            <button disabled={sibuk} onClick={() => kirim({ aksi: 'setujui', guruId: guru.id })}>Setujui</button>{' '}
            <button className="garis-bahaya" disabled={sibuk} onClick={() => setTanya('tolak')}>Tolak</button>
          </>
        ) : (
          <>
            {guru.aktif
              ? <button className="garis-bahaya" disabled={sibuk} onClick={() => setTanya('nonaktif')}>Nonaktifkan</button>
              : <button className="garis-hijau" disabled={sibuk} onClick={() => kirim({ aksi: 'aktif', guruId: guru.id, aktif: true })}>Aktifkan</button>}{' '}
            <button className="biasa" disabled={sibuk} onClick={() => setTanya('sandi')}>Atur ulang sandi</button>
          </>
        )}
        {pesan && <div role="alert" className="galat">{pesan}</div>}

        <Konfirmasi
          buka={tanya === 'nonaktif'} judul={`Nonaktifkan ${guru.nama}?`} teksYa="Ya, nonaktifkan" bahaya sibuk={sibuk}
          onBatal={() => setTanya(null)} onYa={() => kirim({ aksi: 'aktif', guruId: guru.id, aktif: false })}
        >
          <p>Guru ini akan langsung keluar dari semua perangkat dan <b>tidak bisa masuk</b> sampai diaktifkan kembali.</p>
          <p>Berkas dan riwayatnya tidak dihapus. Guru nonaktif tidak dihitung di ringkasan dan rekap.</p>
        </Konfirmasi>
        <Konfirmasi
          buka={tanya === 'sandi'} judul={`Atur ulang sandi ${guru.nama}?`} teksYa="Ya, buat sandi baru" sibuk={sibuk}
          onBatal={() => setTanya(null)} onYa={() => kirim({ aksi: 'atur_ulang_sandi', guruId: guru.id })}
        >
          <p>Sandi lama tidak berlaku lagi dan guru keluar dari semua perangkat. Sandi baru berupa <b>8 angka acak</b> dan hanya tampil sekali.</p>
        </Konfirmasi>
        <Konfirmasi
          buka={tanya === 'tolak'} judul={`Tolak pendaftaran ${guru.nama}?`} teksYa="Ya, tolak dan hapus" bahaya sibuk={sibuk}
          onBatal={() => setTanya(null)} onYa={() => kirim({ aksi: 'tolak_daftar', guruId: guru.id })}
        >
          <p>Akun yang didaftarkan dengan username <b>{guru.username}</b> akan dihapus. Guru bisa mendaftar ulang bila datanya keliru.</p>
        </Konfirmasi>
      </td>
    </tr>
  )
}
