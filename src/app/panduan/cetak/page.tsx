import { SEMUA_BAGIAN } from '../konten'
import { ZONA_WAKTU } from '@/lib/waktu'
import pkg from '../../../../package.json'
import BukaLipatan from './BukaLipatan'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Buku panduan aplikasi Verval Sertifikasi Guru',
  description: 'Seluruh isi panduan dalam satu dokumen, dipakai untuk membuat berkas PDF.',
  robots: { index: false },
}

const KELOMPOK = [
  ['a', 'Bagian A · Panduan untuk guru'],
  ['b', 'Bagian B · Panduan untuk admin'],
  ['l', 'Lampiran · Rujukan cepat'],
] as const

/** Seluruh panduan dalam satu halaman (sampul, daftar isi, semua bagian). Dicetak menjadi PDF oleh scripts/panduan-pdf.mjs. */
export default function PanduanCetakPage() {
  const tanggal = new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'long' }).format(new Date())

  return (
    <div className="panduan-cetak">
      <BukaLipatan />

      <header className="cetak-sampul">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={96} height={87} />
        <p className="cetak-sampul__instansi">Kementerian Agama</p>
        <h1>Buku Panduan Aplikasi Verval Sertifikasi Guru</h1>
        <p className="cetak-sampul__sub">
          Tata cara mengunggah dan memverifikasi dokumen sertifikasi guru Pendidikan Agama Islam secara daring.
        </p>
        <p className="cetak-sampul__meta">Versi aplikasi {pkg.version} · {tanggal}</p>
      </header>

      <nav className="cetak-isi" aria-label="Daftar isi">
        <h2>Daftar isi</h2>
        {KELOMPOK.map(([awalan, judul]) => (
          <section key={awalan}>
            <h3>{judul}</h3>
            <ul>
              {SEMUA_BAGIAN.filter((b) => b.id.startsWith(awalan)).map((b) => (
                <li key={b.id}>
                  <a href={`#bagian-${b.id}`}><span className="panduan-kode-tag">{b.kode}</span> {b.judul}</a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      {KELOMPOK.map(([awalan, judul]) => (
        <section key={awalan} className="cetak-kelompok">
          <h2 className="cetak-kelompok__judul">{judul}</h2>
          {SEMUA_BAGIAN.filter((b) => b.id.startsWith(awalan)).map((b) => (
            <article key={b.id} id={`bagian-${b.id}`} className="cetak-bagian">
              <h3 className="panduan-judul">
                <span className="panduan-kode-tag">{b.kode}</span>
                {b.judul}
              </h3>
              <p className="panduan-ringkas-lede">{b.ringkasan}</p>
              <div className="panduan-isi-artikel">{b.konten}</div>
            </article>
          ))}
        </section>
      ))}
    </div>
  )
}
