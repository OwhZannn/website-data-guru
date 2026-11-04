'use client'
import { useEffect, useState } from 'react'

/** true setelah komponen terhidrasi; dipakai agar formulir tidak bisa dikirim sebelum JavaScript siap. */
export function useTerpasang(): boolean {
  const [terpasang, setTerpasang] = useState(false)
  useEffect(() => setTerpasang(true), [])
  return terpasang
}
