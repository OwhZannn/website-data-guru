/** Kartu hijau dengan cincin progres. Kalimat "Progres: x dari y dokumen sah" tetap tampil utuh. */
export default function KartuProgres(p: { sah: number; wajib: number; keterangan?: string }) {
  const persen = p.wajib > 0 ? Math.round((p.sah / p.wajib) * 100) : 0
  return (
    <div className="progres">
      <div
        className="cincin"
        role="img"
        aria-label={`${persen} persen`}
        style={{ background: `conic-gradient(#fff 0 ${persen}%, rgba(255,255,255,.25) 0)` }}
      >
        <span>{p.sah}/{p.wajib}</span>
      </div>
      <div>
        <b>Progres: {p.sah} dari {p.wajib} dokumen sah</b>
        {p.keterangan && <p>{p.keterangan}</p>}
      </div>
    </div>
  )
}
