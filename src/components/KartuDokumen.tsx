import type { Riwayat } from '@prisma/client'
import { Upload, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import TombolUnggah from './TombolUnggah'

const LABEL: Record<string, string> = {
  BELUM: 'Belum diunggah',
  MENUNGGU: 'Menunggu diperiksa',
  SAH: 'SAH',
  DITOLAK: 'Ditolak',
}
const IKON: Record<string, React.ReactNode> = {
  BELUM: <Upload size={16} aria-hidden="true" />,
  MENUNGGU: <Clock size={16} aria-hidden="true" />,
  SAH: <CheckCircle2 size={16} aria-hidden="true" />,
  DITOLAK: <AlertCircle size={16} aria-hidden="true" />,
}
const TOMBOL: Record<string, string> = { BELUM: 'Unggah', MENUNGGU: 'Ganti file', DITOLAK: 'Unggah ulang' }
const AKSI: Record<string, string> = {
  unggah: 'Diunggah',
  ganti_file: 'File diganti',
  sahkan: 'Disahkan',
  tolak: 'Ditolak',
  batalkan: 'Pengesahan dibatalkan',
}

export type DataRiwayat = Pick<Riwayat, 'id' | 'aksi' | 'alasan'> & { waktuTeks: string }

export default function KartuDokumen(p: {
  dokumenId: string
  nama: string
  status: string
  alasan: string | null
  namaFile: string | null
  riwayat: DataRiwayat[]
  bolehUnggah: boolean
}) {
  const tombol = p.bolehUnggah ? TOMBOL[p.status] : undefined
  return (
    <section className={p.status === 'DITOLAK' ? 'kartu ditolak' : 'kartu'}>
      <div className="kartu-atas">
        <span className={`ikon-status ${p.status}`}>{IKON[p.status] ?? <span aria-hidden="true">•</span>}</span>
        <div>
          <h2>{p.nama}</h2>
          {p.namaFile && p.status !== 'BELUM' && <div className="kartu-sub">Berkas: {p.namaFile}</div>}
        </div>
        <span className={`label ${p.status}`}>{LABEL[p.status] ?? p.status}</span>
      </div>
      {p.status === 'DITOLAK' && p.alasan && <div className="alasan">Alasan penolakan: {p.alasan}</div>}
      {tombol && <TombolUnggah dokumenId={p.dokumenId} teks={tombol} />}
      {p.riwayat.length > 0 && (
        <ul className="riwayat" aria-label={`Riwayat ${p.nama}`}>
          {p.riwayat.map((r) => (
            <li key={r.id}>
              {r.waktuTeks} - {AKSI[r.aksi] ?? r.aksi}
              {r.alasan ? `: ${r.alasan}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
