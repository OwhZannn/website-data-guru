import { AlertCircle, Upload, Clock } from 'lucide-react'

export default function KartuLangkahBerikutnya(p: {
  ditolak: number
  belum: number
  menunggu: number
}) {
  const perluTindakan = p.ditolak + p.belum

  return (
    <div className="langkah-berikutnya" data-testid="langkah-berikutnya">
      <h2 className="langkah-berikutnya__judul">Langkah berikutnya</h2>
      <div className="langkah-berikutnya__baris">
        <span className="langkah-status langkah-status--tolak">
          <AlertCircle size={15} aria-hidden="true" />
          <span data-testid="hitung-ditolak">{p.ditolak}</span> ditolak
        </span>
        <span className="langkah-status langkah-status--belum">
          <Upload size={15} aria-hidden="true" />
          <span data-testid="hitung-belum">{p.belum}</span> belum diunggah
        </span>
        <span className="langkah-status langkah-status--tunggu">
          <Clock size={15} aria-hidden="true" />
          <span data-testid="hitung-menunggu">{p.menunggu}</span> menunggu
        </span>
      </div>
      {perluTindakan > 0 && (
        <a className="tombol tombol--primer langkah-berikutnya__aksi" href="#perlu-tindakan">
          Lihat dokumen perlu tindakan
        </a>
      )}
    </div>
  )
}
