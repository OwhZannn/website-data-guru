'use client'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

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

  const urlPratinjau = `https://drive.google.com/file/d/${fileId}/preview`
  const urlDrive = `https://drive.google.com/file/d/${fileId}/view`

  return (
    <div className={`pratinjau-panel${tampil ? '' : ' pratinjau-panel--sembunyikan'}`}>
      {/* Kepala: nama + tautan Drive selalu terlihat */}
      <div className="pratinjau-kepala">
        <span className="pratinjau-nama">{namaDokumen}</span>
        <a
          href={urlDrive}
          target="_blank"
          rel="noopener noreferrer"
          className="tombol-garis tombol-garis--sm"
          aria-label="Buka di Drive"
          title="Buka di Drive"
        >
          <ExternalLink size={16} />
          <span>Buka di Drive</span>
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
        <iframe
          src={urlPratinjau}
          title={`Pratinjau ${namaDokumen}`}
          className="pratinjau-iframe"
          allow="autoplay"
          loading="lazy"
        />
      </div>
    </div>
  )
}
