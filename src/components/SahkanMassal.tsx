'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Konfirmasi from './Konfirmasi'
import { useToast } from './Toast'

type DokItem = { id: string; nama: string; fileId: string }

export default function SahkanMassal({
  guruId,
  periodeId,
  dokumen,
}: {
  guruId: string
  periodeId: string
  dokumen: DokItem[]
}) {
  const router = useRouter()
  const { tampilkan } = useToast()
  const [buka, setBuka] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')

  if (dokumen.length === 0) return null

  async function sahkanSemua() {
    setSibuk(true)
    setPesan('')
    try {
      const r = await fetch('/api/admin/keputusan/massal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ guruId, periodeId, dokumen: dokumen.map((d) => ({ id: d.id, fileId: d.fileId })) }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) {
        setPesan(j?.pesan ?? 'Terjadi kesalahan. Silakan coba lagi.')
        setBuka(false)
        return
      }
      tampilkan(
        j.dilewati > 0
          ? `${j.jumlah} dokumen disahkan. ${j.dilewati} dilewati karena sudah berubah, periksa ulang.`
          : `${j.jumlah} dokumen berhasil disahkan.`,
        'sukses',
      )
      setBuka(false)
      router.refresh()
    } catch {
      setPesan('Gagal terhubung. Coba lagi.')
      setBuka(false)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        data-testid="tombol-sahkan-massal"
        style={{ marginBottom: 'var(--s-3)' }}
      >
        Sahkan semua yang menunggu ({dokumen.length})
      </button>
      {pesan && <p className="galat" role="alert">{pesan}</p>}
      <Konfirmasi
        buka={buka}
        judul={`Sahkan ${dokumen.length} dokumen sekaligus?`}
        teksYa="Sahkan semua"
        sibuk={sibuk}
        onYa={sahkanSemua}
        onBatal={() => setBuka(false)}
      >
        <p>Dokumen berikut akan disahkan:</p>
        <ul style={{ margin: '8px 0', paddingLeft: '1.2em' }}>
          {dokumen.map((d) => <li key={d.id}>{d.nama}</li>)}
        </ul>
        <p style={{ color: 'var(--redup)', fontSize: 'var(--t-sm)' }}>Hanya dokumen dengan file yang diproses.</p>
      </Konfirmasi>
    </>
  )
}
