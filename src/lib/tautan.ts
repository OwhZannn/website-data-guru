/** Menentukan apakah href memakai next/link (navigasi klien) atau <a> biasa. */
export function pakaiLink(href: string): boolean {
  if (!href) return false
  if (href.startsWith('//')) return false
  if (href.startsWith('#')) return false
  if (href === '/api' || href.startsWith('/api/') || href.startsWith('/api?') || href.startsWith('/api#')) return false
  return href.startsWith('/')
}
