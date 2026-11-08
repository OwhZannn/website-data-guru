import type { ReactNode } from 'react'
import type { Admin } from '@prisma/client'
import type { Periode } from '@prisma/client'
import { AdminSidebar, AdminLaci } from './AdminSidebarClient'
import TombolKeluar from './TombolKeluar'
import PilihPeriodeHeader from './PilihPeriodeHeader'
import { ToastProvider } from './Toast'

/**
 * Cangkang tata letak halaman admin:
 * - Header sticky dengan logo, pemilih periode, nama admin, tombol keluar
 * - Sidebar kiri (≥1024 px) yang bisa dilipat
 * - Laci navigasi mobile (<1024 px)
 * - Area konten utama
 */
export default function AdminShell({
  admin,
  daftarPeriode,
  periodeId,
  jumlahAntrean,
  children,
}: {
  admin: Pick<Admin, 'nama'>
  daftarPeriode: Pick<Periode, 'id' | 'nama' | 'dibuka'>[]
  periodeId?: string | null
  jumlahAntrean: number
  children: ReactNode
}) {
  return (
    <ToastProvider>
    <div className="admin-cangkang">
      <header className="admin-kepala">
        {/* Hamburger mobile */}
        <div className="admin-kepala__hamburger-slot">
          <AdminLaci jumlahAntrean={jumlahAntrean} periodeId={periodeId} />
        </div>

        {/* Logo & judul */}
        <div className="admin-kepala__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={34} height={31} />
          <div>
            <div className="admin-kepala__judul">Panel Admin</div>
            <div className="admin-kepala__sub">Verval Sertifikasi Guru</div>
          </div>
        </div>

        {/* Pemilih periode */}
        {daftarPeriode.length >= 2 && (
          <PilihPeriodeHeader daftar={daftarPeriode} dipilih={periodeId ?? ''} />
        )}

        {/* Nama + keluar */}
        <div className="admin-kepala__aksi">
          <span className="admin-kepala__nama">{admin.nama}</span>
          <TombolKeluar />
        </div>
      </header>

      <div className="admin-tubuh">
        <AdminSidebar jumlahAntrean={jumlahAntrean} periodeId={periodeId} />
        <main className="admin-konten lebar">
          {children}
        </main>
      </div>
    </div>
    </ToastProvider>
  )
}
