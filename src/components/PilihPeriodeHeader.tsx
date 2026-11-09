'use client'

import { useEffect, useState } from 'react'
import type { Periode } from '@prisma/client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { paramPeriodeBaru } from '@/lib/pilihPeriodeUrl'

/**
 * Satu-satunya pemilih periode (header admin dan header guru). Menerapkan begitu nilainya diganti, dengan
 * mempertahankan parameter lain (q, status, per, urut ...); halaman dan filter khusus periode dibuang.
 * Tanpa JavaScript tetap formulir GET yang membawa parameter lain lewat input tersembunyi, dengan
 * tombol dari <noscript>.
 */
export default function PilihPeriodeHeader(p: {
  daftar: Pick<Periode, 'id' | 'nama' | 'dibuka'>[]
  dipilih: string
  varian?: 'admin' | 'guru'
}) {
  const router = useRouter()
  const jalur = usePathname()
  const sp = useSearchParams()

  const [siap, setSiap] = useState(false)
  useEffect(() => setSiap(true), [])

  // Layout tidak menerima searchParams; periode yang dipilih dibaca dari URL di klien.
  const dipilih = sp.get('periode') ?? p.dipilih
  const lain = [...paramPeriodeBaru(sp, null).entries()]

  return (
    <form method="get" action={jalur} data-siap={siap || undefined} className={`pilih-periode${p.varian === 'guru' ? ' pilih-periode--guru' : ''}`}>
      {lain.map(([k, v]) => <input key={`${k}=${v}`} type="hidden" name={k} value={v} />)}
      <select
        key={dipilih} name="periode" aria-label="Pilih periode" defaultValue={dipilih}
        onChange={(e) => {
          const q = paramPeriodeBaru(sp, e.target.value).toString()
          router.push(q ? `${jalur}?${q}` : jalur)
        }}
      >
        {p.daftar.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nama}{x.dibuka ? ' (dibuka)' : ''}
          </option>
        ))}
      </select>
      <noscript><button type="submit" className="tombol-sm">Ganti</button></noscript>
    </form>
  )
}
