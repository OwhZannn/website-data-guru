/**
 * Content-Security-Policy dengan nonce per permintaan (dipasang di src/middleware.ts).
 * Next.js membaca nonce dari header CSP permintaan dan memasangnya pada skripnya sendiri;
 * skrip tema sebaris di layout memakai nonce yang sama lewat header `x-nonce`.
 */
export function susunCsp(nonce: string, dev = process.env.NODE_ENV !== 'production'): string {
  const arahan: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'strict-dynamic': potongan JS yang dimuat skrip bernonce (termasuk impor dinamis pdf.js) ikut diizinkan.
    // 'unsafe-eval' hanya di mode dev (React memakai eval untuk jejak tumpukan).
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    // Atribut style={...} dari React tidak bisa diberi nonce.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(dev ? ['ws:'] : [])],
    'worker-src': ["'self'", 'blob:'],
    // Cadangan pratinjau memuat /api/dokumen/berkas dalam iframe dari domain sendiri.
    'frame-src': ["'self'"],
    'frame-ancestors': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'report-uri': ['/api/csp-laporan'],
  }
  return Object.entries(arahan).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ')
}

/** `CSP_TEGAKKAN=1` memblokir pelanggaran; bawaan hanya melaporkan (Report-Only). */
export const namaHeaderCsp = (tegakkan = process.env.CSP_TEGAKKAN === '1') =>
  tegakkan ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
