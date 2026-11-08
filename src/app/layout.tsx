import type { ReactNode } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// Diunduh saat build lalu di-host sendiri; browser guru tidak memanggil Google.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata = { title: 'Verval Sertifikasi Guru', icons: { icon: '/logo-kemenag.png' } }
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark' as const,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#006316' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1a12' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  )
}
