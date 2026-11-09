/** Waktu singkat untuk kolom aktivitas: relatif untuk seminggu terakhir, selebihnya tanggal. */
export function formatAktivitas(ts: number, sekarang: Date = new Date()): string {
  const d = new Date(ts)
  const selisihHari = Math.floor((sekarang.getTime() - d.getTime()) / 86400000)
  if (selisihHari <= 0) return 'Hari ini'
  if (selisihHari === 1) return 'Kemarin'
  if (selisihHari < 7) return `${selisihHari} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
