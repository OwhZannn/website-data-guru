import Tautan from '@/components/ui/Tautan'
import { SEMUA_BAGIAN } from './konten'
import TombolPdf from './TombolPdf'

export const metadata = {
  title: 'Buku panduan aplikasi Verval Sertifikasi Guru',
  description: 'Tata cara mengunggah dan memverifikasi dokumen sertifikasi guru Pendidikan Agama Islam secara daring.',
}

function KartuTopik({ b }: { b: typeof SEMUA_BAGIAN[number] }) {
  return (
    <Tautan href={`/panduan/${b.id}`} className="panduan-kartu-topik">
      <div className="panduan-kartu-topik__kepala">
        <span className="panduan-kode-tag">{b.kode}</span>
        <span className="panduan-kartu-topik__judul">{b.judul}</span>
      </div>
      <p className="panduan-kartu-topik__ringkas">{b.ringkasan}</p>
    </Tautan>
  )
}

export default function PanduanIndexPage() {
  const guru = SEMUA_BAGIAN.filter((b) => b.id.startsWith('a'))
  const admin = SEMUA_BAGIAN.filter((b) => b.id.startsWith('b'))
  const lampiran = SEMUA_BAGIAN.filter((b) => b.id.startsWith('l'))

  return (
    <div className="panduan-index">
      <div className="panduan-pembuka">
        <p className="panduan-eyebrow">Dokumentasi &amp; Panduan Penggunaan</p>
        <h1>Buku panduan aplikasi Verval Sertifikasi Guru</h1>
        <p className="panduan-ringkas-lede">
          Tata cara mengunggah dan memverifikasi dokumen sertifikasi guru Pendidikan Agama Islam secara daring.
          Aplikasi ini menggantikan penyerahan berkas cetak dan bisa dibuka dari HP maupun komputer.
        </p>
        <p className="teks-sm redup">
          Pilih salah satu topik di bawah atau gunakan menu di samping untuk membaca petunjuk lengkap per bagian.
        </p>
        <TombolPdf />
      </div>

      <section className="panduan-kelompok-index" id="bagian-a">
        <div className="panduan-kelompok-index__kepala">
          <h2>Bagian A · Panduan untuk guru</h2>
          <p className="redup">
            Petunjuk mulai dari membuat akun, melengkapi profil, mencentang tugas tambahan, hingga mengunggah berkas dan lanjut ke SIAGA.
          </p>
        </div>
        <div className="panduan-kisi-kartu">
          {guru.map((b) => <KartuTopik key={b.id} b={b} />)}
        </div>
      </section>

      <section className="panduan-kelompok-index" id="bagian-b">
        <div className="panduan-kelompok-index__kepala">
          <h2>Bagian B · Panduan untuk admin</h2>
          <p className="redup">
            Petunjuk menyiapkan periode, mengelola akun guru, memeriksa dokumen berkas, hingga mengunduh rekapitulasi data.
          </p>
        </div>
        <div className="panduan-kisi-kartu">
          {admin.map((b) => <KartuTopik key={b.id} b={b} />)}
        </div>
      </section>

      <section className="panduan-kelompok-index" id="lampiran">
        <div className="panduan-kelompok-index__kepala">
          <h2>Lampiran · Rujukan cepat</h2>
          <p className="redup">
            Daftar baku 24 dokumen, penjelasan status verval, dan jawaban atas pertanyaan yang sering diajukan.
          </p>
        </div>
        <div className="panduan-kisi-kartu">
          {lampiran.map((b) => <KartuTopik key={b.id} b={b} />)}
        </div>
      </section>
    </div>
  )
}
