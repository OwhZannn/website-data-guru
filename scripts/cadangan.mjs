// Cadangan harian: node scripts/cadangan.mjs [berkasDb] [dirCadangan]
// Bawaan: data/prod.db -> data/cadangan/prod-YYYY-MM-DD.db (env BERKAS_DB, DIR_CADANGAN). Simpan 30 terbaru.
// Butuh CLI sqlite3 di server (apt install sqlite3).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Salinan dari src/lib/waktu.ts (skrip .mjs tidak bisa mengimpor TypeScript). Jaga agar tetap sama.
export const ZONA_WAKTU = 'Asia/Makassar'
export const tanggalLokal = (d) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_WAKTU, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)

export const POLA = /^prod-\d{4}-\d{2}-\d{2}(-\d+)?\.db$/
const SIMPAN = 30

export function jalankanCadangan({ berkasDb, dirCadangan, sekarang = new Date(), simpan = SIMPAN }) {
  if (!existsSync(berkasDb)) throw new Error(`Basis data tidak ditemukan: ${berkasDb}`)
  mkdirSync(dirCadangan, { recursive: true })
  const dasar = `prod-${tanggalLokal(sekarang)}`
  let tujuan = join(dirCadangan, `${dasar}.db`)
  for (let n = 2; existsSync(tujuan); n++) tujuan = join(dirCadangan, `${dasar}-${n}.db`)
  // VACUUM INTO: salinan konsisten walau basis data sedang dipakai. Tanda kutip tunggal digandakan.
  execFileSync('sqlite3', [berkasDb, `VACUUM INTO '${tujuan.replace(/'/g, "''")}'`], { stdio: ['ignore', 'pipe', 'pipe'] })
  if (!existsSync(tujuan)) throw new Error('Berkas cadangan tidak terbentuk')
  const dihapus = pangkas(dirCadangan, simpan)
  return { tujuan, dihapus }
}

/** Hapus yang tertua, hanya berkas bernama prod-YYYY-MM-DD[-n].db. Urutan: tanggal lalu nomor. */
export function pangkas(dirCadangan, simpan = SIMPAN) {
  const kunci = (f) => {
    const [, t, n] = f.match(/^prod-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.db$/)
    return `${t}#${String(n ?? 1).padStart(6, '0')}`
  }
  const cocok = readdirSync(dirCadangan).filter((f) => POLA.test(f)).sort((a, b) => kunci(a).localeCompare(kunci(b)))
  const hapus = cocok.slice(0, Math.max(0, cocok.length - simpan))
  for (const f of hapus) unlinkSync(join(dirCadangan, f))
  return hapus
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const berkasDb = process.argv[2] ?? process.env.BERKAS_DB ?? 'data/prod.db'
    const dirCadangan = process.argv[3] ?? process.env.DIR_CADANGAN ?? 'data/cadangan'
    const { tujuan, dihapus } = jalankanCadangan({ berkasDb, dirCadangan })
    console.log(`Cadangan dibuat: ${tujuan} (dihapus ${dihapus.length} yang lama)`)
  } catch (e) {
    console.error(`Cadangan GAGAL: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  }
}
