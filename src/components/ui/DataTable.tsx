import type { ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import PilihPerHalaman from '@/components/PilihPerHalaman'
import { ariaSort, bangunTautan, teksRentang, type ArahUrut } from '@/lib/dataTable'
import { PILIHAN_PER, nomorHalaman, type RingkasanHalaman } from '@/lib/paginasi'

export type Kolom<B> = {
  id: string
  /** Label tajuk (huruf biasa) sekaligus label sel di tampilan ponsel. */
  label: string
  sel: (baris: B) => ReactNode
  /** Kolom dapat diurut: arah saat ini (null bila bukan kolom aktif) dan tautan klik berikutnya. */
  urut?: { arah: ArahUrut | null; href: string }
  /** Kelas tambahan untuk sel, mis. `nowrap`. */
  kelas?: string
  /** Di ponsel label tidak ditampilkan (mis. kolom nama dan aksi). */
  tanpaLabelPonsel?: boolean
}

type Props<B> = {
  /** Nama tabel: dibaca pembaca layar sebagai caption dan dipakai pada label navigasi halaman. */
  keterangan: string
  kolom: Kolom<B>[]
  baris: B[]
  kunciBaris: (baris: B) => string
  kelasBaris?: (baris: B) => string | undefined
  /** Hasil `potongHalaman` (tanpa isi). */
  ringkasan: RingkasanHalaman
  /** Parameter URL yang dipertahankan saat pindah halaman atau mengganti jumlah per halaman. */
  dasar: Record<string, string | number | null | undefined>
  /** Satuan pada "Menampilkan x–y dari z …", mis. "guru". */
  satuan?: string
  /** Isi keadaan kosong (biasanya `<EmptyState />`), tampil di dalam kartu. */
  kosong: ReactNode
  pilihanPer?: readonly number[]
}

/**
 * Tabel ringkas dalam kartu yang mengisi sisa tinggi layar: isi menggulir di dalam kartu dengan tajuk
 * lengket, footer berisi jumlah per halaman, rentang data, dan paginasi. Komponen server; seluruh navigasi
 * berupa tautan atau formulir GET sehingga jalan tanpa JavaScript. Di bawah 640px baris menjadi kartu
 * bertumpuk. Letakkan di dalam `.halaman-tabel` agar tinggi kartu mengikuti sisa viewport.
 */
export default function DataTable<B>(p: Props<B>) {
  const { ringkasan: r } = p
  const tautan = (ubah: Record<string, string | number>) => bangunTautan({ ...p.dasar, per: r.per }, ubah)
  const kosong = p.baris.length === 0
  const nama = p.satuan ? `Halaman daftar ${p.satuan}` : 'Halaman'

  return (
    <div className="dt">
      <div className="dt__gulir" tabIndex={0} role="region" aria-label={`Isi tabel ${p.keterangan.toLowerCase()}`}>
        {kosong ? (
          <div className="dt__kosong">{p.kosong}</div>
        ) : (
          <table>
            <caption className="sr-only">{p.keterangan}</caption>
            <thead>
              <tr>
                {p.kolom.map((k) => (
                  <th key={k.id} scope="col" aria-sort={k.urut ? ariaSort(k.urut.arah) : undefined}>
                    {k.urut ? (
                      <a href={k.urut.href} className="tajuk-urut">
                        {k.label}
                        {k.urut.arah === 'asc' ? <ChevronUp size={14} aria-hidden="true" />
                          : k.urut.arah === 'desc' ? <ChevronDown size={14} aria-hidden="true" />
                          : <ChevronsUpDown size={14} aria-hidden="true" />}
                      </a>
                    ) : k.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.baris.map((b) => (
                <tr key={p.kunciBaris(b)} className={p.kelasBaris?.(b)}>
                  {p.kolom.map((k) => (
                    <td key={k.id} data-label={k.label} className={[k.kelas, k.tanpaLabelPonsel ? 'dt__tanpa-label' : ''].filter(Boolean).join(' ') || undefined}>
                      {k.sel(b)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dt__kaki">
        <PilihPerHalaman dasar={p.dasar} per={r.per} pilihan={p.pilihanPer ?? PILIHAN_PER} />
        <span className="dt__rentang" role="status">{teksRentang(r.dari, r.sampai, r.total, p.satuan)}</span>
        {r.jumlahHal > 1 && (
          <nav className="paginasi-nomor" aria-label={nama}>
            {r.hal > 1 ? <a href={tautan({ hal: r.hal - 1 })} rel="prev">‹ Sebelumnya</a> : <span className="mati">‹ Sebelumnya</span>}
            {nomorHalaman(r.hal, r.jumlahHal).map((n, i) =>
              n === null
                ? <span key={`celah-${i}`} className="celah">…</span>
                : <a key={n} href={tautan({ hal: n })} aria-current={n === r.hal ? 'page' : undefined}>{n}</a>,
            )}
            {r.hal < r.jumlahHal ? <a href={tautan({ hal: r.hal + 1 })} rel="next">Berikutnya ›</a> : <span className="mati">Berikutnya ›</span>}
          </nav>
        )}
      </div>
    </div>
  )
}
