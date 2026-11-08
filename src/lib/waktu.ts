export const ZONA_WAKTU = 'Asia/Makassar'

/** Tanggal YYYY-MM-DD menurut ZONA_WAKTU. */
export const tanggalLokal = (d: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_WAKTU, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

/**
 * Waktu relatif dalam Bahasa Indonesia: "X menit", "X jam", "X hari", "X minggu".
 * Dipakai untuk menampilkan lama tunggu di antrean pemeriksaan.
 */
export function selisihWaktuIndonesia(sejak: Date, sekarang: Date = new Date()): string {
  const detik = Math.floor((sekarang.getTime() - sejak.getTime()) / 1000)
  if (detik < 120) return 'baru saja'
  const menit = Math.floor(detik / 60)
  if (menit < 60) return `${menit} menit`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam} jam`
  const hari = Math.floor(jam / 24)
  if (hari < 14) return `${hari} hari`
  const minggu = Math.floor(hari / 7)
  return `${minggu} minggu`
}
