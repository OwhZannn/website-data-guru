import { describe, it, expect } from 'vitest'
import { pakaiLink } from '@/lib/tautan'

describe('pakaiLink', () => {
  it.each([
    ['/admin', true],
    ['/admin?x=1', true],
    ['/admin#a', true],
    ['/profil#id', true],
    ['#a', false],
    ['/api/x', false],
    ['/api/admin/rekap?periodeId=1', false],
    ['https://a.b', false],
    ['http://a.b', false],
    ['mailto:a@b.c', false],
    ['//x.y', false],
    ['', false],
  ])('%s -> %s', (href, hasil) => {
    expect(pakaiLink(href)).toBe(hasil)
  })
})
