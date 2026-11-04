import type { Periode } from '@prisma/client'

/** Pemilih periode berbasis GET (?periode=<id>); tanpa JavaScript. Parameter lain dipertahankan. */
export default function PilihPeriode(p: {
  daftar: Pick<Periode, 'id' | 'nama' | 'dibuka'>[]
  dipilih: string
  lain?: Record<string, string>
}) {
  if (p.daftar.length < 2) return null
  return (
    <form method="get">
      {Object.entries(p.lain ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <select name="periode" aria-label="Pilih periode" defaultValue={p.dipilih}>
        {p.daftar.map((x) => <option key={x.id} value={x.id}>{x.nama}{x.dibuka ? ' (dibuka)' : ''}</option>)}
      </select>{' '}
      <button type="submit">Tampilkan</button>
    </form>
  )
}
