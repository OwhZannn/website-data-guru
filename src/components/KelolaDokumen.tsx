'use client'
import { FileText } from 'lucide-react'
import EmptyState from './ui/EmptyState'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BERLAKU, LABEL_BERLAKU } from '@/lib/syarat'
import DataTable, { type Kolom } from './ui/DataTable'
import PageHeader from './ui/PageHeader'

type Dok = { id: string; nama: string; urutan: number; berlakuUntuk: string }

export default function KelolaDokumen({ periodeId, periodeNama, aktif, nonaktif }: { periodeId: string; periodeNama: string; aktif: Dok[]; nonaktif: Dok[] }) {
  const kosong = aktif.length === 0 && nonaktif.length === 0
  const router = useRouter()
  const [nama, setNama] = useState('')
  const [berlaku, setBerlaku] = useState('semua')
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
  async function denganPeringatan(dokumenId: string | undefined, jalan: () => Promise<void>, berlakuUntuk?: string) {
    setSibuk(true); setPesan('')
    try {
      const q = new URLSearchParams({ periodeId, ...(dokumenId ? { dokumenId } : {}), ...(berlakuUntuk ? { berlakuUntuk } : {}) })
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
    if (await kirim({ aksi: 'tambah', periodeId, nama, berlakuUntuk: berlaku })) { setNama(''); setBerlaku('semua') }
  }, berlaku)

  const kolomAktif: Kolom<Dok>[] = [
    { id: 'no', label: 'No.', kelas: 'nowrap', sel: (d) => aktif.indexOf(d) + 1 },
    {
      id: 'nama', label: 'Dokumen', tanpaLabelPonsel: true,
      sel: (d) => edit?.id === d.id ? (
        <span className="form-inline">
          <input aria-label="Nama baru" value={edit.nama} maxLength={200} onChange={(e) => setEdit({ id: d.id, nama: e.target.value })} />
          <button type="button" disabled={sibuk} onClick={async () => { if (await kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, nama: edit.nama })) setEdit(null) }}>Simpan</button>
          <button type="button" className="biasa" onClick={() => setEdit(null)}>Batal ubah</button>
        </span>
      ) : <strong>{d.nama}</strong>,
    },
    {
      id: 'berlaku', label: 'Berlaku untuk',
      sel: (d) => (
        <select aria-label={`Berlaku untuk ${d.nama}`} value={d.berlakuUntuk} disabled={sibuk}
          onChange={(e) => kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, berlakuUntuk: e.target.value })}>
          {BERLAKU.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ),
    },
    {
      id: 'aksi', label: 'Aksi', tanpaLabelPonsel: true, kelas: 'nowrap',
      sel: (d) => {
        const i = aktif.indexOf(d)
        return (
          <span className="aksi-baris">
            <button type="button" className="biasa ikon-tombol" disabled={sibuk || i === 0} aria-label={`Naikkan ${d.nama}`}
              onClick={() => kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, arah: 'naik' })}>↑</button>
            <button type="button" className="biasa ikon-tombol" disabled={sibuk || i === aktif.length - 1} aria-label={`Turunkan ${d.nama}`}
              onClick={() => kirim({ aksi: 'ubah', periodeId, dokumenId: d.id, arah: 'turun' })}>↓</button>
            <button type="button" className="biasa" onClick={() => setEdit({ id: d.id, nama: d.nama })}>Ubah nama</button>
            <button type="button" className="biasa" disabled={sibuk} onClick={() => kirim({ aksi: 'nonaktifkan', periodeId, dokumenId: d.id })}>
              Nonaktifkan
            </button>
          </span>
        )
      },
    },
  ]

  const kolomNonaktif: Kolom<Dok>[] = [
    { id: 'nama', label: 'Dokumen', tanpaLabelPonsel: true, sel: (d) => d.nama },
    { id: 'berlaku', label: 'Berlaku untuk', sel: (d) => LABEL_BERLAKU[d.berlakuUntuk] ?? d.berlakuUntuk },
    {
      id: 'aksi', label: 'Aksi', tanpaLabelPonsel: true, kelas: 'nowrap',
      sel: (d) => (
        <button type="button" className="biasa" disabled={sibuk}
          onClick={() => denganPeringatan(d.id, async () => { await kirim({ aksi: 'aktifkan', periodeId, dokumenId: d.id }) })}>
          Aktifkan kembali
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        judul="Daftar dokumen"
        keterangan={periodeNama}
        aksi={(
          <form className="form-inline" onSubmit={(e) => { e.preventDefault(); void tambah() }}>
            <input aria-label="Nama dokumen baru" placeholder="Nama dokumen baru" value={nama} onChange={(e) => setNama(e.target.value)} maxLength={200} />
            <select aria-label="Berlaku untuk" value={berlaku} onChange={(e) => setBerlaku(e.target.value)}>
              {BERLAKU.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button type="submit" disabled={sibuk}>Tambah dokumen</button>
          </form>
        )}
      />

      {kosong && (
        <div className="info">
          <p className="mb-s2">Periode ini belum punya dokumen. Isi dengan 16 dokumen baku verval sertifikasi guru PAI, lalu ubah seperlunya.</p>
          <button type="button" disabled={sibuk} onClick={() => kirim({ aksi: 'isi_baku', periodeId })}>Isi dengan daftar baku</button>
        </div>
      )}

      {tunda && (
        <div role="alertdialog" aria-label="Peringatan" className="kartu mb-0">
          <p>Menambah dokumen ini akan membuat {tunda.jumlah} guru yang sudah lengkap kembali berstatus belum lengkap. Lanjutkan?</p>
          <button type="button" disabled={sibuk} onClick={async () => { const t = tunda; setTunda(null); await t.jalan() }}>Lanjutkan</button>{' '}
          <button type="button" className="biasa" onClick={() => setTunda(null)}>Batal</button>
        </div>
      )}
      {pesan && <p className="galat" role="alert">{pesan}</p>}

      <DataTable
        keterangan="Dokumen aktif" judul="Dokumen aktif"
        kolom={kolomAktif} baris={aktif} kunciBaris={(d) => d.id}
        atributBaris={(d) => ({ 'aria-label': d.nama })}
        jumlahTeks={`${aktif.length} dokumen aktif`}
        catatan="Dokumen yang dinonaktifkan disembunyikan dari guru, bukan dihapus. Berkas yang sudah diunggah tetap tersimpan."
        kosong={<EmptyState ikon={<FileText size={28} />} teks="Belum ada dokumen aktif." />}
      />

      {nonaktif.length > 0 && (
        <DataTable
          kelas="dt--ringkas"
          keterangan="Dokumen nonaktif" judul="Dokumen nonaktif"
          kolom={kolomNonaktif} baris={nonaktif} kunciBaris={(d) => d.id}
          kelasBaris={() => 'nonaktif-item'}
          jumlahTeks={`${nonaktif.length} dokumen nonaktif`}
          kosong={null}
        />
      )}
    </>
  )
}
