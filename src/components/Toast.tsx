'use client'
import { useEffect, useRef, useState, useCallback, createContext, useContext, type ReactNode } from 'react'

type ToastItem = { id: number; pesan: string; tipe: 'sukses' | 'galat' | 'info' }

type ToastCtx = { tampilkan: (pesan: string, tipe?: ToastItem['tipe']) => void }
const Ctx = createContext<ToastCtx>({ tampilkan: () => {} })

export function useToast() {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<ToastItem[]>([])
  const hitungan = useRef(0)

  const tampilkan = useCallback((pesan: string, tipe: ToastItem['tipe'] = 'sukses') => {
    const id = ++hitungan.current
    setDaftar((d) => [...d, { id, pesan, tipe }])
    setTimeout(() => {
      setDaftar((d) => d.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <Ctx.Provider value={{ tampilkan }}>
      {children}
      <div className="toast-wadah" aria-live="polite" aria-atomic="false" role="status">
        {daftar.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipe}`} role="alert">
            {t.pesan}
            <button
              type="button"
              className="toast__tutup"
              aria-label="Tutup notifikasi"
              onClick={() => setDaftar((d) => d.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
