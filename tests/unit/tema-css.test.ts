import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

function muatCss(berkas: string): string {
  const teks = readFileSync(berkas, 'utf8')
  return teks.replace(/@import\s+['"]([^'"]+)['"];/g, (_, rel) => {
    const target = path.resolve(path.dirname(berkas), rel)
    return existsSync(target) ? muatCss(target) : ''
  })
}

const css = muatCss('src/app/globals.css')

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

describe('token kepadatan (Fase 8)', () => {
  const akar = isiBlok(':root {')
  const px = (nilai: string) => {
    const m = nilai.match(/^(-?[\d.]+)(px|rem)$/)
    expect(m, `nilai ${nilai} harus px atau rem`).not.toBeNull()
    return m![2] === 'rem' ? parseFloat(m![1]) * 16 : parseFloat(m![1])
  }
  const token = (nama: string) => {
    const m = akar.match(new RegExp(`${nama}:\\s*([^;]+);`))
    expect(m, `token ${nama} harus ada`).not.toBeNull()
    return m![1].trim()
  }

  it('judul halaman ≤ 1.4rem dan margin judul ≤ 8px', () => {
    expect(px(token('--judul-halaman'))).toBeLessThanOrEqual(22.4)
    expect(token('--judul-margin')).toBe('0 0 var(--s-2)')
    expect(px(token('--s-2'))).toBeLessThanOrEqual(8)
  })

  it('padding bawah konten ≤ 24px', () => {
    expect(token('--konten-pad-bawah')).toBe('var(--s-6)')
    expect(px(token('--s-6'))).toBeLessThanOrEqual(24)
  })

  it('kontrol admin 40px dan tidak ada target di bawah 24px', () => {
    expect(css).toMatch(/\n\.admin-konten \{ --kontrol-tinggi: 40px; \}/)
    expect(px(token('--target-min'))).toBeGreaterThanOrEqual(24)
    expect(px(token('--baris-tabel'))).toBeGreaterThanOrEqual(48)
    expect(px(token('--baris-tabel'))).toBeLessThanOrEqual(56)
  })

  it('h1, main, .kartu dan input memakai token, bukan angka lepas', () => {
    expect(isiBlok('\nmain {')).toContain('var(--konten-pad-bawah)')
    expect(isiBlok('\nh1 {')).toContain('var(--judul-halaman)')
    expect(isiBlok('\n.kartu {')).toContain('var(--jarak-kartu)')
    expect(css).toMatch(/input:not\(\[type=checkbox\]\)[^{]*\{ min-height: var\(--kontrol-tinggi\); \}/)
  })
})
