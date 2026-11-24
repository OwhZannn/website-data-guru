/**
 * Alamat IP klien untuk pembatasan laju. Entri terakhir X-Forwarded-For ditambahkan oleh reverse proxy
 * terdekat (nginx: `$proxy_add_x_forwarded_for`), sedangkan entri sebelumnya dan X-Real-IP bisa dipalsukan
 * pengirim bila proxy tidak menimpanya. X-Real-IP hanya dipakai bila X-Forwarded-For tidak ada.
 */
export function ipKlien(h: Headers): string {
  const terakhir = h.get('x-forwarded-for')?.split(',').pop()?.trim()
  if (terakhir) return terakhir
  return h.get('x-real-ip')?.trim() || 'tanpa-ip'
}
