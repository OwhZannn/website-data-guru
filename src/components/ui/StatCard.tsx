import Tautan from './Tautan'

/** Kartu statistik kecil dengan nilai besar dan label kecil. Server component. */

type Warna = 'sah' | 'tolak' | 'tunggu' | 'belum'

export default function StatCard(p: {
  nilai: number | string
  label: string
  warna?: Warna
  href?: string
}) {
  const cls = `stat-card${p.warna ? ` stat-card--${p.warna}` : ''}`
  const isi = (
    <>
      <span className="stat-card__nilai">{p.nilai}</span>
      <span className="stat-card__label">{p.label}</span>
    </>
  )
  return p.href
    ? <Tautan href={p.href} className={cls}>{isi}</Tautan>
    : <div className={cls}>{isi}</div>
}
