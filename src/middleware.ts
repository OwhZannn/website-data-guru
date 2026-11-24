import { NextResponse, type NextRequest } from 'next/server'
import { namaHeaderCsp, susunCsp } from '@/lib/csp'

export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const csp = susunCsp(nonce)
  const header = namaHeaderCsp()

  const kepalaPermintaan = new Headers(req.headers)
  kepalaPermintaan.set('x-nonce', nonce)
  kepalaPermintaan.set(header, csp)

  const res = NextResponse.next({ request: { headers: kepalaPermintaan } })
  res.headers.set(header, csp)
  return res
}

export const config = {
  matcher: [
    // Aset statis tidak perlu CSP; prefetch tidak perlu nonce baru.
    {
      source: '/((?!_next/static|_next/image|favicon.ico|logo-kemenag.png|pdf.worker.min.mjs|panduan/[^/]+\\.(?:webp|pdf)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
