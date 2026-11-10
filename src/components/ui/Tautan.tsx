import Link from 'next/link'
import type { AnchorHTMLAttributes } from 'react'
import { pakaiLink } from '@/lib/tautan'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  prefetch?: boolean
  scroll?: boolean
}

/** Tautan internal memakai next/link; tautan luar, hash, dan /api/ tetap <a> biasa. */
export default function Tautan({ href, prefetch, scroll, children, ...sisa }: Props) {
  if (!pakaiLink(href)) return <a href={href} {...sisa}>{children}</a>
  return <Link href={href} prefetch={prefetch} scroll={scroll} {...sisa}>{children}</Link>
}
