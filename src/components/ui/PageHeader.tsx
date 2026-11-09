import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import FormOtomatis from '@/components/FormOtomatis'

type Cari = {
  /** Nama parameter URL, mis. `q`. */
  nama: string
  nilai: string
  /** Label aksesibel (tidak tampil). */
  label: string
  placeholder?: string
  /** Bila diisi, kolom dikaitkan ke formulir lain (atribut `form`) agar ikut terkirim bersama filter di halaman. */
  formId?: string
  /** Parameter lain yang dipertahankan saat mencari (dipakai bila `formId` kosong). */
  lain?: Record<string, string | null | undefined>
}

/**
 * Kepala halaman satu baris: judul (dan keterangan singkat satu baris) di kiri, kolom cari bulat berikon,
 * lalu tombol aksi di kanan. Di layar sempit judul sendiri, pencarian penuh lebar, aksi turun satu baris.
 * Satu-satunya `h1` halaman; jangan menambah judul kedua dengan nama yang sama.
 */
export default function PageHeader(p: { judul: string; keterangan?: ReactNode; cari?: Cari; aksi?: ReactNode }) {
  const kolom = p.cari && (
    <>
      <Search size={16} aria-hidden="true" className="ph__ikon" />
      <input
        type="search" name={p.cari.nama} defaultValue={p.cari.nilai} aria-label={p.cari.label}
        placeholder={p.cari.placeholder} form={p.cari.formId} autoComplete="off"
      />
    </>
  )
  return (
    <header className="judul-aksi ph">
      <div className="ph__judul">
        <h1>{p.judul}</h1>
        {p.keterangan && <p className="ph__ket">{p.keterangan}</p>}
      </div>
      {p.cari && (p.cari.formId
        ? <div className="ph__cari" role="search">{kolom}</div>
        : (
          <FormOtomatis className="ph__cari" role="search" tombolTanpaJs="Cari">
            {Object.entries(p.cari.lain ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            {kolom}
          </FormOtomatis>
        ))}
      {p.aksi && <div className="ph__aksi">{p.aksi}</div>}
    </header>
  )
}
