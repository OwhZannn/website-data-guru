'use client'

import type { Periode } from '@prisma/client'
import { useSearchParams } from 'next/navigation'

/** Pemilih periode kompak untuk header admin. Formulir GET biasa, jadi tetap jalan tanpa JS setelah dimuat. */
export default function PilihPeriodeHeader(p: {
  daftar: Pick<Periode, 'id' | 'nama' | 'dibuka'>[]
  dipilih: string
}) {
  // Layout tidak menerima searchParams; periode yang dipilih dibaca dari URL di klien.
  const dipilih = useSearchParams().get('periode') ?? p.dipilih
  return (
    <form method="get" className="admin-kepala__periode">
      <select key={dipilih} name="periode" aria-label="Pilih periode" defaultValue={dipilih}>
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
