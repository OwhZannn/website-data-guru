/** Bilah progres tunggal atau bertumpuk (stacked segments). Server component. */

type Segmen = {
  warna: 'sah' | 'tunggu' | 'tolak' | 'belum'
  nilai: number
  maks: number
}

type Props =
  | { nilai: number; maks: number; segmen?: undefined }
  | { segmen: Segmen[]; nilai?: undefined; maks?: undefined }

export default function ProgressBar(p: Props) {
  if (p.segmen) {
    return (
      <div className="progress-bar progress-bar--bertumpuk" role="meter">
        {p.segmen.map((s, i) => {
          const persen = s.maks > 0 ? Math.round((s.nilai / s.maks) * 100) : 0
          return (
            <div
              key={i}
              className={`progress-bar__segmen progress-bar__segmen--${s.warna}`}
              style={{ width: `${persen}%` }}
            />
          )
        })}
      </div>
    )
  }
  const persen = p.maks > 0 ? Math.round((p.nilai / p.maks) * 100) : 0
  return (
    <div className="progress-bar" role="meter" aria-valuenow={p.nilai} aria-valuemax={p.maks}>
      <div className="progress-bar__isi" style={{ width: `${persen}%` }} />
    </div>
  )
}
