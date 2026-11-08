/** Blok konten dengan judul dan slot aksi opsional. Server component. */
export default function Section(p: {
  judul: string
  aksi?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="ui-section">
      <div className="ui-section__kepala">
        <h2 className="ui-section__judul">{p.judul}</h2>
        {p.aksi && <div className="ui-section__aksi">{p.aksi}</div>}
      </div>
      {p.children}
    </section>
  )
}
