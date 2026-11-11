'use client'
import { useEffect } from 'react'

/** Membuka semua <details> (mis. FAQ) di halaman cetak supaya jawabannya ikut tercetak. */
export default function BukaLipatan() {
  useEffect(() => {
    const buka = () => document.querySelectorAll<HTMLDetailsElement>('.panduan-cetak details').forEach((d) => { d.open = true })
    buka()
    window.addEventListener('beforeprint', buka)
    return () => window.removeEventListener('beforeprint', buka)
  }, [])
  return null
}
