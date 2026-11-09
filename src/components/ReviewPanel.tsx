'use client'
import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { HelpCircle, X } from 'lucide-react'
import TombolKeputusan from './TombolKeputusan'
import PanelPratinjau from './PanelPratinjau'
import { useToast } from './Toast'

type DokItem = {
  id: string
  dokumenGuruId: string
  nama: string
  status: string
  fileId: string | null
  alasan: string | null
}

type Props = {
  guruId: string
  periodeId: string
  dokumen: DokItem[]
  dokTerpilihId: string | null
  alasanPreset: string[]
  /** link ke guru berikutnya dengan dokumen menunggu, bila ada */
  guruBerikutnyaId: string | null
  guruBerikutnyaNama: string | null
  /** riwayat guru ini; tampil di kolom kanan dengan tinggi terbatas dan gulir sendiri */
  riwayat?: ReactNode
}

const PINTASAN = [
  { tombol: 'S', label: 'Sahkan dokumen terpilih' },
  { tombol: 'T', label: 'Buka panel tolak' },
  { tombol: 'J', label: 'Dokumen berikutnya' },
  { tombol: 'K', label: 'Dokumen sebelumnya' },
  { tombol: '?', label: 'Tampilkan / sembunyikan bantuan ini' },
]

export default function ReviewPanel({
  guruId,
  periodeId,
  dokumen,
  dokTerpilihId,
  alasanPreset,
  guruBerikutnyaId,
  guruBerikutnyaNama,
  riwayat,
}: Props) {
  const router = useRouter()
  const { tampilkan } = useToast()
  const [dipilih, setDipilih] = useState<string | null>(
    dokTerpilihId ?? dokumen.find((d) => d.status === 'MENUNGGU')?.dokumenGuruId ?? dokumen[0]?.dokumenGuruId ?? null,
  )
  const [modeTolak, setModeTolak] = useState(false)
  const [bantuanBuka, setBantuanBuka] = useState(false)
  const bantuanRef = useRef<HTMLDialogElement>(null)

  const dok = dokumen.find((d) => d.dokumenGuruId === dipilih) ?? dokumen[0] ?? null

  // Sync dialog
  useEffect(() => {
    const d = bantuanRef.current
    if (!d) return
    if (bantuanBuka && !d.open) d.showModal()
    if (!bantuanBuka && d.open) d.close()
  }, [bantuanBuka])

  // Auto-advance ke dokumen MENUNGGU berikutnya
  const advanceNext = useCallback(() => {
    const idxSekarang = dokumen.findIndex((d) => d.dokumenGuruId === dipilih)
    const berikutnya = dokumen.slice(idxSekarang + 1).find((d) => d.status === 'MENUNGGU')
    if (berikutnya) {
      setDipilih(berikutnya.dokumenGuruId)
      router.push(`?dok=${berikutnya.dokumenGuruId}`, { scroll: false })
    } else {
      router.refresh()
    }
  }, [dipilih, dokumen, router])

  const pindahIdx = useCallback((arah: 1 | -1) => {
    const idx = dokumen.findIndex((d) => d.dokumenGuruId === dipilih)
    const target = dokumen[idx + arah]
    if (target) {
      setDipilih(target.dokumenGuruId)
      router.push(`?dok=${target.dokumenGuruId}`, { scroll: false })
    }
  }, [dipilih, dokumen, router])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Abaikan bila fokus di input / textarea / select atau modifier ditekan
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case 's':
        case 'S':
          if (dok?.status === 'MENUNGGU' && dok.fileId) {
            e.preventDefault()
            sahkanDenganShortcut()
          }
          break
        case 't':
        case 'T':
          if (dok?.status === 'MENUNGGU') {
            e.preventDefault()
            setModeTolak(true)
          }
          break
        case 'j':
        case 'J':
          e.preventDefault()
          pindahIdx(1)
          break
        case 'k':
        case 'K':
          e.preventDefault()
          pindahIdx(-1)
          break
        case '?':
          e.preventDefault()
          setBantuanBuka((v) => !v)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dok, pindahIdx])

  async function sahkanDenganShortcut() {
    if (!dok) return
    try {
      const r = await fetch('/api/admin/keputusan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ aksi: 'sahkan', dokumenGuruId: dok.dokumenGuruId }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) {
        tampilkan(j?.pesan ?? 'Terjadi kesalahan.', 'galat')
        return
      }
      tampilkan(`${dok.nama} berhasil disahkan.`, 'sukses')
      advanceNext()
    } catch {
      tampilkan('Gagal terhubung.', 'galat')
    }
  }

  const menunggu = dokumen.filter((d) => d.status === 'MENUNGGU')
  const semuaSelesai = menunggu.length === 0

  return (
    <div className="review-wrap">
      {/* Panel kiri: pratinjau */}
      <div className="review-kiri">
        {dok ? (
          <PanelPratinjau fileId={dok.fileId} namaDokumen={dok.nama} />
        ) : (
          <p className="redup">Pilih dokumen di kanan.</p>
        )}
      </div>

      {/* Panel kanan: daftar + keputusan */}
      <div className="review-kanan">
        {/* Pintasan keyboard */}
        <div className="review-bantuan">
          <span className="review-judul">Dokumen ({dokumen.length})</span>
          <button
            type="button"
            className="biasa tombol-kecil"
            onClick={() => setBantuanBuka(true)}
            aria-label="Pintasan keyboard"
            title="Pintasan keyboard (?)"
          >
            <HelpCircle size={14} />
            <span>Pintasan</span>
          </button>
        </div>

        {/* Daftar dokumen */}
        <div className="review-daftar">
          {dokumen.map((d) => (
            <button
              key={d.dokumenGuruId}
              type="button"
              className={`review-item${dipilih === d.dokumenGuruId ? ' review-item--aktif' : ''}`}
              onClick={() => {
                setDipilih(d.dokumenGuruId)
                setModeTolak(false)
              }}
              data-testid={`dok-item-${d.dokumenGuruId}`}
            >
              <span className={`label label--kecil ${d.status}`}>
                {d.status === 'MENUNGGU' ? 'Menunggu' : d.status === 'SAH' ? 'SAH' : d.status === 'BELUM' ? 'Belum' : 'Ditolak'}
              </span>
              <span role="heading" aria-level={3} className="ml-s2">{d.nama}</span>
            </button>
          ))}
        </div>

        {/* Panel keputusan untuk dokumen terpilih */}
        {dok && (
          <div className="review-keputusan">
            <h3>{dok.nama}</h3>
            {dok.alasan && (
              <p className="review-alasan">
                Alasan: {dok.alasan}
              </p>
            )}
            {modeTolak ? (
              <TombolKeputusan
                dokumenGuruId={dok.dokumenGuruId}
                status={dok.status}
                alasanPreset={alasanPreset}
                onBerhasil={() => { setModeTolak(false); advanceNext() }}
              />
            ) : (
              <TombolKeputusan
                dokumenGuruId={dok.dokumenGuruId}
                status={dok.status}
                alasanPreset={alasanPreset}
                onBerhasil={() => { advanceNext() }}
              />
            )}
          </div>
        )}

        {/* Setelah semua selesai */}
        {semuaSelesai && (
          <div className="review-selesai">
            <p className="review-selesai__judul">Semua dokumen sudah diputuskan ✓</p>
            {guruBerikutnyaId && (
              <a
                href={`/admin/guru/${guruBerikutnyaId}?periode=${periodeId}`}
                data-testid="link-guru-berikutnya"
              >
                Guru berikutnya: {guruBerikutnyaNama} ›
              </a>
            )}
            <a href={`/admin/antrean?periode=${periodeId}`}>Kembali ke antrean</a>
          </div>
        )}

        {riwayat && (
          <section className="review-riwayat" aria-label="Riwayat">
            <h3 className="review-riwayat__judul">Riwayat</h3>
            <div className="review-riwayat__gulir" role="region" aria-label="Daftar riwayat" tabIndex={0}>
              {riwayat}
            </div>
          </section>
        )}
      </div>

      {/* Overlay bantuan pintasan */}
      <dialog
        ref={bantuanRef}
        className="konfirmasi"
        aria-labelledby="bantuan-judul"
        onCancel={(e) => { e.preventDefault(); setBantuanBuka(false) }}
      >
        {bantuanBuka && (
          <>
            <div className="dialog-kepala">
              <h2 id="bantuan-judul" className="mt-0 mb-0">Pintasan Keyboard</h2>
              <button
                type="button"
                className="biasa"
                onClick={() => setBantuanBuka(false)}
                aria-label="Tutup bantuan"
              >
                <X size={16} />
              </button>
            </div>
            <table className="tabel-pintasan">
              <tbody>
                {PINTASAN.map((p) => (
                  <tr key={p.tombol}>
                    <td className="tabel-pintasan__tombol">{p.tombol}</td>
                    <td>{p.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="konfirmasi-aksi">
              <button type="button" onClick={() => setBantuanBuka(false)} autoFocus>Tutup</button>
            </div>
          </>
        )}
      </dialog>
    </div>
  )
}
