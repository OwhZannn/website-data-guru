/** Kerangka memuat: blok abu-abu berkilau sebagai pengganti konten selama halaman server disusun. */
export function Blok(p: { tinggi?: number | string; lebar?: number | string; bulat?: boolean }) {
  return (
    <span
      className={p.bulat ? 'kerangka kerangka--bulat' : 'kerangka'}
      style={{ height: p.tinggi ?? 16, width: p.lebar ?? '100%' }}
    />
  )
}

/** Pembungkus halaman memuat: aria-busy dan teks "Memuat…" untuk pembaca layar. */
export default function Kerangka(p: { children: React.ReactNode; className?: string }) {
  return (
    <div className={p.className} aria-busy="true">
      <span className="sr-only" role="status">Memuat…</span>
      <div aria-hidden="true">{p.children}</div>
    </div>
  )
}
