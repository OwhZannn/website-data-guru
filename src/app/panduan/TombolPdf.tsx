import { statSync } from 'node:fs'
import { join } from 'node:path'
import { Download, FileText } from 'lucide-react'
import { NAMA_PDF_PANDUAN, URL_PDF_PANDUAN } from './pdf'

/** Ukuran berkas dalam teks pendek ("3,2 MB"); null bila berkas belum dibuat. */
export function ukuranPdfPanduan(): string | null {
  try {
    const byte = statSync(join(process.cwd(), 'public', 'panduan', NAMA_PDF_PANDUAN)).size
    return byte >= 1024 * 1024
      ? `${(byte / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
      : `${Math.max(1, Math.round(byte / 1024))} KB`
  } catch {
    return null
  }
}

/** Tombol unduh dan pratinjau PDF panduan. Tidak tampil bila berkas PDF belum dibuat. */
export default function TombolPdf({ kelas = '' }: { kelas?: string }) {
  const ukuran = ukuranPdfPanduan()
  if (!ukuran) return null
  return (
    <div className={`panduan-pdf ${kelas}`.trim()}>
      <a className="tombol" href={URL_PDF_PANDUAN} download={NAMA_PDF_PANDUAN}>
        <Download size={16} strokeWidth={2} aria-hidden="true" />
        <span>Unduh PDF</span>
        <small>{ukuran}</small>
      </a>
      <a className="tombol-garis" href={URL_PDF_PANDUAN} target="_blank" rel="noopener">
        <FileText size={16} strokeWidth={2} aria-hidden="true" />
        <span>Pratinjau PDF<span className="sr-only"> (tab baru)</span></span>
      </a>
    </div>
  )
}
