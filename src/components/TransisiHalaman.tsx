'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** Kunci per alamat memulai ulang animasi masuk setiap pindah halaman; animasinya sendiri ada di CSS. */
export default function TransisiHalaman({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return <div key={pathname} className="halaman-masuk">{children}</div>
}
