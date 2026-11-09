/** Blok konten dengan judul dan slot aksi opsional. `kartu`: ringkas dalam kartu sendiri. Server component. */
export default function Section(p: {
  judul: string
  aksi?: React.ReactNode
  kartu?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={p.kartu ? 'ui-section ui-section--kartu' : 'ui-section'}>
      <div className="ui-section__kepala">
        <h2 className="ui-section__judul">{p.judul}</h2>
        {p.aksi && <div className="ui-section__aksi">{p.aksi}</div>}
      </div>
      {p.children}
    </section>
  )
}
