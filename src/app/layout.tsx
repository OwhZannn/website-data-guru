import type { ReactNode } from 'react'
import './globals.css'

export const metadata = { title: 'Data Guru' }
export const viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
