import { halamanAdmin } from '@/lib/halaman'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HalamanAlasan() {
  await halamanAdmin()

  return (
    <>
      <h1>Alasan Penolakan</h1>
      <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <Clock size={48} strokeWidth={1.5} style={{ color: 'var(--redup)', marginBottom: '16px' }} />
        <h2 style={{ marginTop: 0 }}>Segera hadir</h2>
        <p className="redup">Halaman pengelolaan alasan penolakan akan tersedia di Fase 3.</p>
        <a href="/admin" className="tombol mt-s4" style={{ display: 'inline-block' }}>Kembali ke beranda</a>
      </div>
    </>
  )
}
