'use client'
import { useRouter } from 'next/navigation'

export default function TombolKeluar() {
  const router = useRouter()
  return (
    <button
      type="button"
      className="biasa"
      onClick={async () => {
        await fetch('/api/auth/keluar', { method: 'POST' }).catch(() => null)
        router.push('/masuk')
        router.refresh()
      }}
    >
      Keluar
    </button>
  )
}
