'use client'

import FormOtomatis from './FormOtomatis'

/** "Tampilkan [20 ▾] per halaman": formulir GET yang berlaku begitu diganti; tanpa JavaScript lewat tombol <noscript>. */
export default function PilihPerHalaman(p: {
  dasar: Record<string, string | number | null | undefined>
  per: number
  pilihan: readonly number[]
}) {
  return (
    <FormOtomatis className="dt__per" tombolTanpaJs="Ubah">
      {Object.entries(p.dasar).map(([k, v]) =>
        k === 'per' || k === 'hal' || v === null || v === undefined || v === '' ? null : <input key={k} type="hidden" name={k} value={String(v)} />)}
      <label>
        Tampilkan{' '}
        <select name="per" defaultValue={String(p.per)}>
          {p.pilihan.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>{' '}
        per halaman
      </label>
    </FormOtomatis>
  )
}
