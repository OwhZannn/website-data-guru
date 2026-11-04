import { redirect } from 'next/navigation'
import { wajibGuru } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Beranda() {
  let masuk = true
  try {
    await wajibGuru()
  } catch {
    masuk = false
  }
  redirect(masuk ? '/dokumen' : '/masuk')
}
