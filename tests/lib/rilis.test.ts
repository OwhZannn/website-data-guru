import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { jenisDariLabel, naikkan, commitRilis, putuskan } from '../../scripts/rilis.mjs'

describe('jenisDariLabel', () => {
  it('bawaan patch tanpa label', () => expect(jenisDariLabel([])).toBe('patch'))
  it('label lain tidak berpengaruh', () => expect(jenisDariLabel(['bug', 'ui/ux'])).toBe('patch'))
  it('rilis:minor dan rilis:major menaikkan', () => {
    expect(jenisDariLabel(['rilis:minor'])).toBe('minor')
    expect(jenisDariLabel(['rilis:major'])).toBe('major')
  })
  it('yang tertinggi menang bila ada beberapa', () => expect(jenisDariLabel(['rilis:major', 'rilis:minor', 'rilis:patch'])).toBe('major'))
  it('tanpa-rilis membatalkan, bahkan bila ada rilis:major', () => {
    expect(jenisDariLabel(['tanpa-rilis'])).toBeNull()
    expect(jenisDariLabel(['rilis:major', 'tanpa-rilis'])).toBeNull()
  })
  it('tidak peka huruf besar dan spasi', () => expect(jenisDariLabel([' Rilis:Minor '])).toBe('minor'))
})

describe('naikkan', () => {
  it('patch, minor, major', () => {
    expect(naikkan('1.1.0', 'patch')).toBe('1.1.1')
    expect(naikkan('1.1.9', 'minor')).toBe('1.2.0')
    expect(naikkan('1.9.9', 'major')).toBe('2.0.0')
  })
  it('menolak versi atau jenis yang salah', () => {
    expect(() => naikkan('1.1', 'patch')).toThrow()
    expect(() => naikkan('1.1.0-beta', 'patch')).toThrow()
    expect(() => naikkan('1.1.0', 'besar')).toThrow()
  })
})

describe('putuskan', () => {
  it('melewati commit rilis buatan workflow', () => {
    expect(commitRilis('Rilis v1.1.1')).toBe(true)
    expect(commitRilis('Merge pull request #5 dari Rilis v1')).toBe(false)
    expect(putuskan({ versi: '1.1.0', pesan: 'Rilis v1.1.1' }).jenis).toBe('lewati')
  })
  it('melewati PR tanpa-rilis', () => expect(putuskan({ versi: '1.1.0', labels: ['tanpa-rilis'] })).toMatchObject({ jenis: 'lewati' }))
  it('menghitung versi baru dan alasannya', () => {
    expect(putuskan({ versi: '1.1.0' })).toEqual({ jenis: 'patch', baru: '1.1.1', alasan: 'bawaan (patch)' })
    expect(putuskan({ versi: '1.1.0', labels: ['rilis:minor'] })).toEqual({ jenis: 'minor', baru: '1.2.0', alasan: 'label rilis:minor' })
  })
})

describe('CLI', () => {
  const jalan = (...a: string[]) => execFileSync('node', ['scripts/rilis.mjs', ...a], { encoding: 'utf8' })
  it('mencetak key=value untuk $GITHUB_OUTPUT', () => {
    expect(jalan('--versi', '1.1.0', '--label', 'rilis:major')).toBe('jenis=major\nbaru=2.0.0\nalasan=label rilis:major\n')
    expect(jalan('--versi', '1.1.0', '--label', 'tanpa-rilis')).toBe('jenis=lewati\nalasan=PR berlabel tanpa-rilis\n')
  })
  it('gagal dengan kode 1 bila versi tidak valid', () => {
    expect(() => execFileSync('node', ['scripts/rilis.mjs', '--versi', 'abc'], { stdio: 'pipe' })).toThrow()
  })
})
