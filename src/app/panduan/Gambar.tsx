import type { ReactNode } from 'react'

/** Gambar panduan: tangkapan layar atau klip singkat (WebP beranimasi yang berputar sendiri). */
export default function Gambar(p: { berkas: string; alt: string; lebar: number; tinggi: number; ponsel?: boolean; children: ReactNode }) {
  return (
    <figure className={`panduan-gambar${p.ponsel ? ' panduan-gambar--ponsel' : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/panduan/${p.berkas}`} alt={p.alt} width={p.lebar} height={p.tinggi} loading="lazy" decoding="async" />
      <figcaption>{p.children}</figcaption>
    </figure>
  )
}
