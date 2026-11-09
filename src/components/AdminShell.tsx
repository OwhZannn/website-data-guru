import type { ReactNode } from 'react'
import type { Admin } from '@prisma/client'
import type { Periode } from '@prisma/client'
import { AdminSidebar, AdminLaci } from './AdminSidebarClient'
import MenuProfil from './MenuProfil'
import PilihPeriodeHeader from './PilihPeriodeHeader'
import { ToastProvider } from './Toast'
import TransisiHalaman from './TransisiHalaman'

/**
 * Cangkang tata letak halaman admin:
 * - Header sticky dengan logo, pemilih periode, dan menu profil (tema + keluar)
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
  admin: Pick<Admin, 'nama' | 'email'>
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

        <div className="admin-kepala__aksi">
          <MenuProfil
            nama={admin.nama}
            peran="Admin"
            keterangan={admin.email}
            tautan={[{ href: '/admin/akun', teks: 'Akun saya', ikon: 'akun' }]}
          />
        </div>
      </header>

      <div className="admin-tubuh">
        <AdminSidebar jumlahAntrean={jumlahAntrean} periodeId={periodeId} />
        <main className="admin-konten lebar">
          <TransisiHalaman>{children}</TransisiHalaman>
        </main>
      </div>
    </div>
    </ToastProvider>
  )
}
