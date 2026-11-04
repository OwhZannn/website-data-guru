import { redirect } from 'next/navigation'
import { wajibAdmin, wajibGuru } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ada = (f: () => Promise<unknown>) => f().then(() => true, () => false)

export default async function Beranda() {
  if (await ada(wajibAdmin)) redirect('/admin')
  redirect((await ada(wajibGuru)) ? '/dokumen' : '/masuk')
}
