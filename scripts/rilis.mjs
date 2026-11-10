// Menentukan jenis kenaikan versi dari label PR yang baru digabung. Dipakai job "rilis" di .github/workflows/deploy.yml.
//   node scripts/rilis.mjs --versi 1.1.0 [--label rilis:minor ...] [--pesan "Merge pull request #1 ..."]
// Keluaran (key=value, siap ditulis ke $GITHUB_OUTPUT): jenis=patch|minor|major|lewati, baru=X.Y.Z, alasan=...
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export const URUTAN = ['patch', 'minor', 'major']

/** 'tanpa-rilis' membatalkan rilis; selain itu bawaan patch, dan label `rilis:minor` / `rilis:major` menaikkannya (tertinggi menang). */
/** @param {string[]} [labels] @returns {string | null} */
export function jenisDariLabel(labels = []) {
  const l = new Set(labels.map((x) => String(x).trim().toLowerCase()))
  if (l.has('tanpa-rilis')) return null
  let jenis = 'patch'
  for (const j of URUTAN) if (l.has(`rilis:${j}`)) jenis = j
  return jenis
}

/** @param {string} versi @param {string} jenis */
export function naikkan(versi, jenis) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(versi).trim())
  if (!m) throw new Error(`Versi tidak valid: ${versi}`)
  let [a, b, c] = m.slice(1).map(Number)
  if (jenis === 'major') { a++; b = 0; c = 0 }
  else if (jenis === 'minor') { b++; c = 0 }
  else if (jenis === 'patch') { c++ }
  else throw new Error(`Jenis kenaikan tidak dikenal: ${jenis}`)
  return `${a}.${b}.${c}`
}

/** Commit kenaikan versi buatan workflow sendiri tidak boleh memicu rilis lagi. */
/** @param {string} [pesan] */
export const commitRilis = (pesan = '') => /^Rilis v\d+\.\d+\.\d+/.test(pesan.trim())

/**
 * @param {{ versi: string, labels?: string[], pesan?: string }} p
 * @returns {{ jenis: string, baru?: string, alasan: string }}
 */
export function putuskan({ versi, labels = [], pesan = '' }) {
  if (commitRilis(pesan)) return { jenis: 'lewati', alasan: 'commit ini adalah commit rilis' }
  const jenis = jenisDariLabel(labels)
  if (!jenis) return { jenis: 'lewati', alasan: 'PR berlabel tanpa-rilis' }
  return { jenis, baru: naikkan(versi, jenis), alasan: labels.some((x) => /^rilis:/i.test(x)) ? `label rilis:${jenis}` : 'bawaan (patch)' }
}

function baca(argv) {
  /** @type {{ labels: string[], versi: string, pesan: string }} */
  const o = { labels: [], versi: '', pesan: '' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--versi') o.versi = argv[++i] ?? ''
    else if (argv[i] === '--label') o.labels.push(argv[++i] ?? '')
    else if (argv[i] === '--pesan') o.pesan = argv[++i] ?? ''
  }
  return o
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const h = putuskan(baca(process.argv.slice(2)))
    console.log(`jenis=${h.jenis}`)
    if (h.baru) console.log(`baru=${h.baru}`)
    console.log(`alasan=${h.alasan}`)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
