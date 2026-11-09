import type { Riwayat } from '@prisma/client'
import { CheckCircle2, XCircle, Upload, RotateCcw, Folder } from 'lucide-react'
import { ZONA_WAKTU } from '@/lib/waktu'

type Props = {
  riwayat: Riwayat[]
  namaPelaku: Map<string, string>
}

const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'medium', timeStyle: 'short' }).format(d) + ' WITA'

function ikonAksi(aksi: string) {
  switch (aksi) {
    case 'sahkan':
      return <CheckCircle2 size={16} color="var(--sah)" aria-hidden="true" />
    case 'tolak':
      return <XCircle size={16} color="var(--tolak)" aria-hidden="true" />
    case 'unggah':
    case 'ganti_file':
      return <Upload size={16} color="var(--tunggu)" aria-hidden="true" />
    case 'batalkan':
      return <RotateCcw size={16} color="var(--redup)" aria-hidden="true" />
    default:
      return <Folder size={16} color="var(--redup)" aria-hidden="true" />
  }
}

const LABEL_AKSI: Record<string, string> = {
  unggah: 'Diunggah',
  ganti_file: 'File diganti',
  sahkan: 'Disahkan',
  tolak: 'Ditolak',
  batalkan: 'Keputusan dibatalkan',
}

export default function TimelineRiwayat({ riwayat, namaPelaku }: Props) {
  if (riwayat.length === 0) return <p className="redup">Belum ada riwayat.</p>

  return (
    <ol className="timeline">
      {riwayat.map((r, idx) => {
        const nama = namaPelaku.get(r.id) ?? r.oleh
        const label = LABEL_AKSI[r.aksi] ?? r.aksi
        return (
          <li key={r.id} className="timeline-item">
            {/* Garis vertikal */}
            {idx < riwayat.length - 1 && (
              <span aria-hidden="true" className="timeline-garis" />
            )}
            {/* Ikon */}
            <span className="timeline-ikon">{ikonAksi(r.aksi)}</span>
            {/* Konten */}
            <div>
              <div className="timeline-teks">
                {waktuWita(r.waktu)} — {label} oleh {nama}
                {r.olehTipe === 'admin' ? ' (admin)' : ''}
                {r.alasan ? `: ${r.alasan}` : ''}
              </div>
              {r.alasan && (
                <div className="timeline-alasan">
                  Alasan: {r.alasan}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
