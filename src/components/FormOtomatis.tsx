'use client'

import { useEffect, useRef, useState, useTransition, type ComponentProps } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { samaParam, urlDariIsian } from '@/lib/dataTable'

export const JEDA_CARI_MS = 300

type Props = Omit<ComponentProps<'form'>, 'method' | 'action'> & {
  jeda?: number
  /** Teks tombol yang hanya tampil bila JavaScript mati. */
  tombolTanpaJs?: string
}

const teks = (t: unknown): t is HTMLInputElement =>
  t instanceof HTMLInputElement && (t.type === 'search' || t.type === 'text')
const isian = (t: unknown): t is HTMLInputElement | HTMLSelectElement =>
  t instanceof HTMLInputElement || t instanceof HTMLSelectElement

/**
 * Formulir GET yang menerapkan filter begitu diubah: select langsung, kolom cari setelah jeda
 * (bawaan 300ms) atau saat Enter. Kolom di luar formulir ikut bila memakai atribut `form="id"`.
 * Tanpa JavaScript tetap formulir GET biasa dengan satu tombol kirim dari <noscript>.
 * Navigasi lunak hanya mengganti isi halaman, jadi fokus dan kursor di kolom cari tetap.
 */
export default function FormOtomatis({ children, jeda = JEDA_CARI_MS, tombolTanpaJs = 'Saring', ...sisa }: Props) {
  const router = useRouter()
  const jalur = usePathname()
  const sp = useSearchParams()
  const ref = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const terakhir = useRef<string | null>(null)
  const [sibuk, mulai] = useTransition()
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    const f = ref.current
    if (!f) return

    const kirim = (ganti: boolean) => {
      clearTimeout(timer.current)
      const url = urlDariIsian(jalur, new FormData(f) as unknown as Iterable<[string, FormDataEntryValue]>)
      const tujuan = new URL(url, window.location.origin)
      if (url === terakhir.current || (tujuan.pathname === window.location.pathname
        && samaParam(tujuan.searchParams, new URLSearchParams(window.location.search)))) return
      terakhir.current = url
      mulai(() => (ganti ? router.replace(url) : router.push(url)))
    }
    const saatInput = (e: Event) => {
      if (!teks(e.target) || e.target.form !== f) return
      clearTimeout(timer.current)
      timer.current = setTimeout(() => kirim(true), jeda)
    }
    const saatUbah = (e: Event) => {
      if (!isian(e.target) || e.target.form !== f || teks(e.target)) return
      kirim(false)
    }
    const saatTekan = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !teks(e.target) || e.target.form !== f) return
      e.preventDefault()
      kirim(true)
    }
    const saatKirim = (e: Event) => { e.preventDefault(); kirim(false) }

    setSiap(true)
    document.addEventListener('input', saatInput)
    document.addEventListener('change', saatUbah)
    document.addEventListener('keydown', saatTekan)
    f.addEventListener('submit', saatKirim)
    return () => {
      clearTimeout(timer.current)
      document.removeEventListener('input', saatInput)
      document.removeEventListener('change', saatUbah)
      document.removeEventListener('keydown', saatTekan)
      f.removeEventListener('submit', saatKirim)
    }
  }, [jalur, router, jeda])

  // Alamat berubah (tombol kembali, tautan "Hapus filter"): selaraskan isian, kecuali yang sedang diketik.
  useEffect(() => {
    terakhir.current = null
    const f = ref.current
    if (!f) return
    for (const el of Array.from(f.elements)) {
      if (!isian(el) || !el.name || el.type === 'hidden' || el === document.activeElement) continue
      const nilai = sp.get(el.name) ?? el.dataset.bawaan ?? ''
      if (el.value !== nilai && (teks(el) || (el instanceof HTMLSelectElement && Array.from(el.options).some((o) => o.value === nilai)))) el.value = nilai
    }
  }, [sp])

  return (
    <form {...sisa} ref={ref} method="get" aria-busy={sibuk || undefined} data-siap={siap || undefined}>
      {children}
      <noscript><button type="submit" className="tombol-sm">{tombolTanpaJs}</button></noscript>
    </form>
  )
}
