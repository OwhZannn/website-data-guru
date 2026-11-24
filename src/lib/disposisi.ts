/** Header Content-Disposition (RFC 6266/5987): nama ASCII sebagai cadangan, nama asli lewat `filename*`. */
export function disposisiInline(nama: string): string {
  const ascii = nama.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_') || 'dokumen'
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nama)}`
}
