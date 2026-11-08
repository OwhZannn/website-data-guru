'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--s-2)' }}>
          <button
            type="button"
            className="biasa"
            onClick={() => setBantuanBuka(true)}
            aria-label="Pintasan keyboard"
            title="Pintasan keyboard (?)"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 'var(--t-sm)' }}
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
              <span className={`label ${d.status}`} style={{ fontSize: 'var(--t-xs)' }}>
                {d.status === 'MENUNGGU' ? 'Menunggu' : d.status === 'SAH' ? 'SAH' : d.status === 'BELUM' ? 'Belum' : 'Ditolak'}
              </span>
              <span role="heading" aria-level={3} style={{ marginLeft: 'var(--s-2)' }}>{d.nama}</span>
            </button>
          ))}
        </div>

        {/* Panel keputusan untuk dokumen terpilih */}
        {dok && (
          <div className="review-keputusan" style={{ marginTop: 'var(--s-4)' }}>
            <h3 style={{ margin: '0 0 var(--s-3)' }}>{dok.nama}</h3>
            {dok.alasan && (
              <p style={{ color: 'var(--tolak)', fontSize: 'var(--t-sm)', marginBottom: 'var(--s-3)' }}>
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
          <div className="review-selesai" style={{ marginTop: 'var(--s-5)', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: 'var(--sah)' }}>Semua dokumen sudah diputuskan ✓</p>
            {guruBerikutnyaId && (
              <a
                href={`/admin/guru/${guruBerikutnyaId}?periode=${periodeId}`}
                style={{ marginRight: 'var(--s-3)' }}
                data-testid="link-guru-berikutnya"
              >
                Guru berikutnya: {guruBerikutnyaNama} ›
              </a>
            )}
            <a href={`/admin/antrean?periode=${periodeId}`}>Kembali ke antrean</a>
          </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-3)' }}>
              <h2 id="bantuan-judul" style={{ margin: 0 }}>Pintasan Keyboard</h2>
              <button
                type="button"
                className="biasa"
                onClick={() => setBantuanBuka(false)}
                aria-label="Tutup bantuan"
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {PINTASAN.map((p) => (
                  <tr key={p.tombol} style={{ borderBottom: '1px solid var(--garis)' }}>
                    <td style={{ padding: '8px 12px 8px 0', fontFamily: 'monospace', fontWeight: 700 }}>{p.tombol}</td>
                    <td style={{ padding: '8px 0' }}>{p.label}</td>
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
