import { halamanGuru } from '@/lib/halaman'

export const dynamic = 'force-dynamic'

export default async function TataLetakGantiSandi({ children }: { children: React.ReactNode }) {
  await halamanGuru()
  return children
}
