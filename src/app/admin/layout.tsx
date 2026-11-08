import type { ReactNode } from 'react'
import { prisma } from '@/lib/db'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import AdminShell from '@/components/AdminShell'

/**
 * Tata letak admin: membungkus semua halaman di /admin/** dengan AdminShell.
 * Auth TIDAK diletakkan di sini — setiap halaman memanggil halamanAdmin() sendiri
 * sehingga pengguna yang belum login tetap diarahkan sebelum ada konten yang dirender.
 *
 * Layout ini hanya menyediakan data shell (daftar periode, jumlah antrean, nama admin)
 * setelah sesi valid; bila tidak ada sesi, halaman anak akan redirect terlebih dahulu.
 */
export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  // Ambil data untuk shell — boleh null/kosong jika belum ada sesi (halaman anak akan redirect).
  const { wajibAdmin } = await import('@/lib/auth')

  let adminData: { nama: string } | null = null
  try {
    adminData = await wajibAdmin()
  } catch {
    // Halaman anak akan menangani redirect; render children saja.
    return <>{children}</>
  }

  const daftarPeriode = await semuaPeriode()
  const periodeAktif = pilihPeriode(daftarPeriode, null)

  const jumlahAntrean = periodeAktif
    ? await prisma.dokumenGuru.count({ where: { periodeId: periodeAktif.id, status: 'MENUNGGU' } })
    : 0

  return (
    <AdminShell
      admin={adminData}
      daftarPeriode={daftarPeriode}
      periodeId={periodeAktif?.id ?? null}
      jumlahAntrean={jumlahAntrean}
    >
      {children}
    </AdminShell>
  )
}
