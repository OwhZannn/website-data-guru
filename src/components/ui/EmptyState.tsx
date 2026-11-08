/** Tampilan kosong dengan ikon, teks, dan aksi opsional. Server component. */
export default function EmptyState(p: {
  ikon: React.ReactNode
  teks: string
  aksi?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__ikon" aria-hidden="true">{p.ikon}</div>
      <p className="empty-state__teks">{p.teks}</p>
      {p.aksi}
    </div>
  )
}
