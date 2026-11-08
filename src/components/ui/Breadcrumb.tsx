/** Navigasi breadcrumb dengan aria-label dan aria-current pada butir terakhir. Server component. */
export default function Breadcrumb(p: { butir: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb">
        {p.butir.map((b, i) => {
          const terakhir = i === p.butir.length - 1
          return (
            <li key={i} className="breadcrumb__butir" aria-current={terakhir ? 'page' : undefined}>
              {!terakhir && i > 0 && <span className="breadcrumb__pemisah" aria-hidden="true">/</span>}
              {terakhir || !b.href
                ? b.label
                : <a href={b.href}>{b.label}</a>}
              {!terakhir && i === 0 && <span className="breadcrumb__pemisah" aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
