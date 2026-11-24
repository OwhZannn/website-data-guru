import { prisma } from '@/lib/db'
import { catatRiwayat, OLEH_SISTEM } from '@/lib/riwayat'
import { tanggalLokal, ZONA_WAKTU } from '@/lib/waktu'

/** Selisih ZONA_WAKTU (WITA) dari UTC; Indonesia tidak memakai waktu musim panas. */
const OFFSET_WITA = '+08:00'
const SEHARI_MS = 24 * 60 * 60 * 1000

/** "YYYY-MM-DD" (hari terakhir unggah, WITA) → saat periode tertutup: pukul 00.00 WITA hari berikutnya. */
export function tenggatDariTanggal(tanggal: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Format tanggal harus YYYY-MM-DD')
  const awalHari = new Date(`${tanggal}T00:00:00${OFFSET_WITA}`)
  if (Number.isNaN(awalHari.getTime()) || tanggalLokal(awalHari) !== tanggal) throw new Error('Tanggal tidak valid')
  return new Date(awalHari.getTime() + SEHARI_MS)
}

/** Kebalikan tenggatDariTanggal: hari terakhir unggah (WITA) sebagai "YYYY-MM-DD". */
export const tanggalDariTenggat = (tenggat: Date): string => tanggalLokal(new Date(tenggat.getTime() - 1))

/** Teks hari terakhir untuk ditampilkan, mis. "Senin, 30 November 2026". */
export const teksTenggat = (tenggat: Date): string =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(tenggat.getTime() - 1))

/** Versi ringkas untuk tabel, mis. "30 Nov 2026". */
export const teksTenggatPendek = (tenggat: Date): string =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(tenggat.getTime() - 1))

export const lewatTenggat = (tenggat: Date | null | undefined, sekarang = new Date()): boolean =>
  !!tenggat && sekarang.getTime() >= tenggat.getTime()

/** Sisa waktu yang mudah dibaca: "3 hari lagi", "5 jam lagi", "kurang dari 1 jam lagi". */
export function sisaWaktu(tenggat: Date, sekarang = new Date()): { teks: string; mendesak: boolean } {
  const ms = tenggat.getTime() - sekarang.getTime()
  if (ms <= 0) return { teks: 'sudah lewat', mendesak: true }
  const jam = Math.floor(ms / 3_600_000)
  const hari = Math.ceil(ms / SEHARI_MS)
  const mendesak = ms <= 3 * SEHARI_MS
  if (jam < 1) return { teks: 'kurang dari 1 jam lagi', mendesak }
  if (jam < 24) return { teks: `${jam} jam lagi`, mendesak }
  return { teks: `${hari} hari lagi`, mendesak }
}

/**
 * Tutup periode yang sudah lewat tenggat dan catat di Riwayat. Dipanggil saat halaman/API membaca periode,
 * jadi tidak butuh cron. Aman dipanggil berulang dan bersamaan: hanya baris yang masih dibuka yang diubah.
 */
export async function tutupPeriodeLewatTenggat(sekarang = new Date()): Promise<void> {
  const lewat = await prisma.periode.findMany({ where: { dibuka: true, tenggat: { lte: sekarang } }, select: { id: true } })
  for (const p of lewat) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.periode.updateMany({ where: { id: p.id, dibuka: true }, data: { dibuka: false } })
      if (count === 1) {
        await catatRiwayat({ periodeId: p.id, aksi: 'tutup_periode', alasan: 'Ditutup otomatis karena tenggat terlewati', oleh: OLEH_SISTEM, olehTipe: 'admin' }, tx)
      }
    })
  }
}
