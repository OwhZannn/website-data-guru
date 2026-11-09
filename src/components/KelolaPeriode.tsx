'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'
import DataTable, { type Kolom } from './ui/DataTable'
import PageHeader from './ui/PageHeader'
import EmptyState from './ui/EmptyState'
import { CalendarX } from 'lucide-react'

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

  const kolom: Kolom<P>[] = [
    {
      id: 'nama', label: 'Periode', tanpaLabelPonsel: true,
      sel: (p) => (
        <>
          <b>{p.nama}</b>
          <div className="kartu-sub">{p.dibuka ? 'Guru sedang bisa mengunggah dokumen.' : 'Guru tidak bisa mengunggah. Admin tetap bisa memeriksa.'}</div>
        </>
      ),
    },
    { id: 'status', label: 'Status', sel: (p) => <span className={p.dibuka ? 'lencana buka' : 'lencana'}>{p.dibuka ? 'Dibuka' : 'Ditutup'}</span> },
    {
      id: 'dokumen', label: 'Dokumen', kelas: 'nowrap',
      sel: (p) => (
        <span className="aksi-baris">
          <a className="tombol-tabel" href={`/admin/periode/${p.id}/dokumen`}>Daftar dokumen</a>
          <a className="tombol-tabel" href={`/api/admin/rekap?periodeId=${p.id}&format=xlsx`}>Rekap XLSX</a>
          <a className="tombol-tabel" href={`/api/admin/rekap?periodeId=${p.id}&format=csv`}>Rekap CSV</a>
        </span>
      ),
    },
    {
      id: 'salin', label: 'Salin dokumen',
      sel: (p) => periode.length > 1 ? (
        <span className="aksi-baris">
          <select aria-label={`Sumber salinan untuk ${p.nama}`} value={sumber[p.id] ?? ''} onChange={(e) => setSumber({ ...sumber, [p.id]: e.target.value })}>
            <option value="">Dari periode lain…</option>
            {periode.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
          </select>
          <button className="biasa" disabled={sibuk || !sumber[p.id]} onClick={() => kirim({ aksi: 'salin', dariPeriodeId: sumber[p.id], kePeriodeId: p.id }, (j) => `${j.jumlah} dokumen disalin ke ${p.nama}`)}>Salin</button>
        </span>
      ) : <span className="redup">—</span>,
    },
    {
      id: 'aksi', label: 'Aksi', tanpaLabelPonsel: true, kelas: 'nowrap',
      sel: (p) => p.dibuka
        ? <button className="garis-bahaya" disabled={sibuk} onClick={() => setTutup(p)}>Tutup periode</button>
        : <button disabled={sibuk} onClick={() => kirim({ aksi: 'buka', periodeId: p.id })}>Buka</button>,
    },
  ]

  return (
    <>
      <PageHeader
        judul="Periode"
        keterangan="Buka, tutup, rekap, dan salin dokumen"
        aksi={(
          <form className="form-inline" onSubmit={(e) => { e.preventDefault(); void kirim({ aksi: 'buat', nama }).then(() => setNama('')) }}>
            <input name="nama" aria-label="Nama periode" placeholder="Nama periode baru, mis. Verval Sertifikasi 2027" value={nama} onChange={(e) => setNama(e.target.value)} />
            <button type="submit" disabled={sibuk}>Buat periode</button>
          </form>
        )}
      />
      {pesan && <p role="status" className="info">{pesan}</p>}
      <DataTable
        keterangan="Daftar periode" judul={`Daftar periode (${periode.length})`}
        kolom={kolom} baris={periode} kunciBaris={(p) => p.id}
        kelasBaris={(p) => (p.dibuka ? 'baris-dibuka' : undefined)}
        atributBaris={(p) => ({ 'data-periode': p.nama })}
        jumlahTeks={`${periode.length} periode`}
        kosong={<EmptyState ikon={<CalendarX size={28} />} teks="Belum ada periode. Buat periode pertama di kanan atas." />}
      />
      <Konfirmasi
        buka={tutup !== null} judul={`Tutup ${tutup?.nama ?? ''}?`} teksYa="Ya, tutup periode" bahaya sibuk={sibuk}
        onBatal={() => setTutup(null)}
        onYa={() => { const p = tutup; if (p) void kirim({ aksi: 'tutup', periodeId: p.id }).then(() => setTutup(null)) }}
      >
        <p>Setelah ditutup, <b>guru tidak bisa lagi mengunggah atau mengganti berkas</b> pada periode ini, dan tombol unggah hilang dari halaman mereka.</p>
        <p>Admin tetap bisa memeriksa, mengesahkan, menolak, dan mengunduh rekap. Periode bisa dibuka lagi kapan saja.</p>
      </Konfirmasi>
    </>
  )
}
