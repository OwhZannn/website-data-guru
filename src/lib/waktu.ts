export const ZONA_WAKTU = 'Asia/Makassar'

/** Tanggal YYYY-MM-DD menurut ZONA_WAKTU. */
export const tanggalLokal = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_WAKTU, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
