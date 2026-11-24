import { describe, it, expect } from 'vitest'
import { namaHeaderCsp, susunCsp } from '../../src/lib/csp'

describe('susunCsp', () => {
  it('produksi: nonce + strict-dynamic, tanpa unsafe-eval dan ws:', () => {
    const csp = susunCsp('abc', false)
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('ws:')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
  })

  it('dev: mengizinkan eval dan websocket untuk HMR', () => {
    const csp = susunCsp('abc', true)
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).toContain("connect-src 'self' ws:")
  })

  it('Report-Only kecuali CSP_TEGAKKAN=1', () => {
    expect(namaHeaderCsp(false)).toBe('Content-Security-Policy-Report-Only')
    expect(namaHeaderCsp(true)).toBe('Content-Security-Policy')
  })
})
