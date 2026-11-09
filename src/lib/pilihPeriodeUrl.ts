/** Parameter yang hanya bermakna untuk satu periode atau satu halaman hasil; dibuang saat periode diganti. */
const PARAM_PERIODE_SPESIFIK = ['hal', 'dok']

/**
 * Parameter URL setelah periode diganti: semua parameter lain dipertahankan, `periode` diisi `periodeId`
 * (atau dibuang bila null), serta `hal` dan `dok` dibuang karena tidak berlaku lintas periode.
 */
export function paramPeriodeBaru(sekarang: { entries(): Iterable<[string, string]> }, periodeId: string | null): URLSearchParams {
  const p = new URLSearchParams()
  for (const [k, v] of sekarang.entries()) {
    if (k === 'periode' || PARAM_PERIODE_SPESIFIK.includes(k)) continue
    p.append(k, v)
  }
  if (periodeId) p.set('periode', periodeId)
  return p
}
