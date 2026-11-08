'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'
import { umumkanSandiBaru } from './BannerSandi'
import ProgressBar from './ui/ProgressBar'

type G = { id: string; nama: string; username: string; aktif: boolean; disetujui: boolean; keterangan?: string }
type S = { jumlahSah: number; jumlahWajib: number; label: string }
type Tanya = 'nonaktif' | 'sandi' | 'tolak'

/** Format waktu singkat untuk kolom aktivitas: relatif hari ini, atau tanggal. */
function formatAktivitas(ts: number): string {
  const d = new Date(ts)
  const sekarang = new Date()
  const selisihHari = Math.floor((sekarang.getTime() - d.getTime()) / 86400000)
  if (selisihHari === 0) return 'Hari ini'
  if (selisihHari === 1) return 'Kemarin'
  if (selisihHari < 7) return `${selisihHari} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function BarisGuru({ guru, status, aktivitas, adaPeriode }: {
  guru: G
  status?: S
  aktivitas?: number
  adaPeriode?: boolean
}) {
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
    <tr className={`baris-guru${guru.disetujui ? '' : ' baris-menunggu'}`}>
      <td data-label="Nama">
        {/* Stretched link: ::after pseudo-elemen memperluas area klik seluruh baris (CSS) */}
        <a href={`/admin/guru/${guru.id}`} className="baris-guru__tautan"><b>{guru.nama}</b></a>
        {guru.keterangan && <div className="kartu-sub">{guru.keterangan}</div>}
      </td>
      <td data-label="NIP / NIK">{guru.username}</td>
      {adaPeriode && status && (
        <>
          <td data-label="Progres">
            {!guru.disetujui || status.label === '-'
              ? <span className="redup">-</span>
              : (
                <div className="progres-mini">
                  <ProgressBar nilai={status.jumlahSah} maks={status.jumlahWajib} />
                  <span className="progres-mini__teks">{status.jumlahSah}/{status.jumlahWajib}</span>
                </div>
              )}
          </td>
          <td data-label="Status">
            {!guru.disetujui || status.label === '-' ? <span className="redup">-</span>
              : <span className={`label ${status.label.replace(/ /g, '-')}`}>{status.label}</span>}
          </td>
          <td data-label="Aktivitas">
            <span className="redup">{aktivitas ? formatAktivitas(aktivitas) : '-'}</span>
          </td>
        </>
      )}
      <td data-label="Akun">
        {!guru.disetujui ? <span className="label Perlu-dicek">Menunggu persetujuan</span>
          : guru.aktif ? 'Aktif' : <strong className="galat">Nonaktif</strong>}
      </td>
      <td data-label="Aksi" className="nowrap">
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
