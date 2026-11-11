'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import PDFViewer from './PDFViewer'

export default function PanelPratinjau({
  fileId,
  namaDokumen,
  tampil = true,
}: {
  fileId: string | null
  namaDokumen: string
  tampil?: boolean
}) {
  const [tampilMobile, setTampilMobile] = useState(false)

  if (!fileId) {
    return (
      <div className="pratinjau-kosong">
        <p className="redup">Belum ada file untuk dokumen ini.</p>
      </div>
    )
  }

  const urlPratinjau = `/api/dokumen/berkas/${fileId}`

  return (
    <div className={`pratinjau-panel${tampil ? '' : ' pratinjau-panel--sembunyikan'}`}>
      {/* Kepala: nama + tombol unduh selalu terlihat */}
      <div className="pratinjau-kepala">
        <span className="pratinjau-nama">{namaDokumen}</span>
        <a
          href={urlPratinjau}
          download
          className="tombol-garis tombol-garis--sm"
          aria-label="Unduh berkas"
          title="Unduh berkas"
        >
          <Download size={16} />
          <span>Unduh</span>
        </a>
      </div>

      {/* Toggle mobile: hanya muncul di bawah 1024px */}
      <div className="pratinjau-mobile-toggle">
        <button
          type="button"
          className="biasa"
          onClick={() => setTampilMobile((v) => !v)}
          aria-expanded={tampilMobile}
        >
          {tampilMobile ? 'Sembunyikan pratinjau' : 'Pratinjau'}
        </button>
      </div>

      <div className={`pratinjau-isi${tampilMobile ? ' pratinjau-isi--aktif' : ''}`}>
        <PDFViewer documentUrl={urlPratinjau} documentName={namaDokumen} />
      </div>
    </div>
  )
}
