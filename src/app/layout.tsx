import type { ReactNode } from 'react'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { SKRIP_AWAL } from '@/lib/tema'
import './globals.css'

// Diunduh saat build lalu di-host sendiri; browser guru tidak memanggil Google.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' })

export const metadata = { title: 'Verval Sertifikasi Guru', icons: { icon: '/logo-kemenag.png' } }
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark' as const,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#16241c' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_AWAL }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
