import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/app/globals.css', 'utf8')

/** Mengambil isi blok CSS yang kurung kurawalnya seimbang, mulai dari pembuka selektor. */
function isiBlok(pembuka: string): string {
  const awal = css.indexOf(pembuka)
  expect(awal, `selektor ${pembuka} harus ada`).toBeGreaterThanOrEqual(0)
  let i = css.indexOf('{', awal), kedalaman = 0
  const mulai = i + 1
  for (; i < css.length; i++) {
    if (css[i] === '{') kedalaman++
    else if (css[i] === '}' && --kedalaman === 0) return css.slice(mulai, i)
  }
  throw new Error('blok tidak seimbang')
}

const normal = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')

describe('mode gelap', () => {
  it('blok data-tema=gelap identik dengan blok prefers-color-scheme', () => {
    const eksplisit = normal(isiBlok(':root[data-tema=gelap] {'))
    const otomatis = normal(isiBlok(':root:not([data-tema=terang]) {'))
    expect(eksplisit.length).toBeGreaterThan(500)
    expect(otomatis).toBe(eksplisit)
  })

  it('setiap token gelap juga punya nilai terang di :root', () => {
    const terang = isiBlok(':root {')
    for (const m of normal(isiBlok(':root[data-tema=gelap] {')).matchAll(/(--[a-z0-9-]+):/g)) {
      expect(terang, `token ${m[1]} belum ada di mode terang`).toContain(`${m[1]}:`)
    }
  })
})

function luminans(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const rasio = (a: string, b: string) => {
  const [x, y] = [luminans(a), luminans(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe('kontras WCAG AA', () => {
  const pasangan: [string, string, number][] = [
    ['--teks', '--latar', 4.5], ['--teks', '--kartu', 4.5], ['--redup', '--kartu', 4.5], ['--redup', '--latar', 4.5],
    ['--tautan', '--kartu', 4.5], ['--tautan-kuat', '--hijau-muda', 4.5], ['--di-aksen', '--hijau-2', 4.5],
    ['--di-aksen', '--bahaya', 4.5], ['--sah', '--sah-bg', 4.5], ['--tolak', '--tolak-bg', 4.5],
    ['--tunggu', '--tunggu-bg', 4.5], ['--belum', '--belum-bg', 4.5], ['--info', '--info-bg', 4.5],
    ['--garis-input', '--kartu', 3], ['--fokus', '--kartu', 3],
  ]
  for (const [nama, blok] of [['terang', ':root {'], ['gelap', ':root[data-tema=gelap] {']] as const) {
    it(`mode ${nama}: semua pasangan teks/latar dan komponen UI memenuhi AA`, () => {
      const terang = isiBlok(':root {')
      const isi = isiBlok(blok)
      for (const [a, b, min] of pasangan) {
        const nilai = (t: string) => {
          const m = isi.match(new RegExp(`${t}:\\s*(#[0-9a-fA-F]{6})`)) ?? terang.match(new RegExp(`${t}:\\s*(#[0-9a-fA-F]{6})`))
          expect(m, `token ${t}`).not.toBeNull()
          return m![1]
        }
        expect(rasio(nilai(a), nilai(b)), `${a} di atas ${b} (${nama})`).toBeGreaterThanOrEqual(min)
      }
    })
  }
})
