export const PILIHAN_PER = [20, 50, 100] as const
export const PER_BAWAAN = 20

/**
 * Ambil satu halaman dari daftar. `per` di luar pilihan jatuh ke bawaan; `hal` di bawah 1, bukan angka,
 * atau melewati halaman terakhir dijepit ke batas terdekat, jadi tautan lama tetap menampilkan sesuatu.
 */
export function potongHalaman<T>(daftar: T[], halMentah?: string, perMentah?: string) {
  const perAngka = Number(perMentah)
  const per = (PILIHAN_PER as readonly number[]).includes(perAngka) ? perAngka : PER_BAWAAN
  const jumlahHal = Math.max(1, Math.ceil(daftar.length / per))
  const halAngka = Math.floor(Number(halMentah))
  const hal = Number.isFinite(halAngka) ? Math.min(Math.max(1, halAngka), jumlahHal) : 1
  const awal = (hal - 1) * per
  return {
    isi: daftar.slice(awal, awal + per),
    hal, per, jumlahHal, total: daftar.length,
    dari: daftar.length === 0 ? 0 : awal + 1,
    sampai: Math.min(awal + per, daftar.length),
  }
}

/** Nomor halaman yang ditampilkan: pertama, terakhir, dan sekitar halaman aktif; celah ditandai null. */
export function nomorHalaman(hal: number, jumlahHal: number): (number | null)[] {
  const tampil = new Set([1, jumlahHal, hal - 1, hal, hal + 1].filter((n) => n >= 1 && n <= jumlahHal))
  const urut = [...tampil].sort((a, b) => a - b)
  const hasil: (number | null)[] = []
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) hasil.push(null)
    hasil.push(n)
  })
  return hasil
}
