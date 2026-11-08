import type { Periode } from '@prisma/client'

/** Pemilih periode kompak untuk header admin. Tidak memerlukan JS. */
export default function PilihPeriodeHeader(p: {
  daftar: Pick<Periode, 'id' | 'nama' | 'dibuka'>[]
  dipilih: string
}) {
  return (
    <form method="get" className="admin-kepala__periode">
      <select name="periode" aria-label="Pilih periode" defaultValue={p.dipilih}>
        {p.daftar.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nama}{x.dibuka ? ' (dibuka)' : ''}
          </option>
        ))}
      </select>
      <button type="submit">Tampilkan</button>
    </form>
  )
}
