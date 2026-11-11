import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { bacaSesi } from '@/lib/sesi'
import PilihTema from '@/components/PilihTema'
import KakiHalaman from '@/components/KakiHalaman'
import MenuProfil from '@/components/MenuProfil'
import Tautan from '@/components/ui/Tautan'
import { PanduanSidebarDesktop, PanduanMobileFold } from './PanduanSidebar'
import TombolPdf from './TombolPdf'

export const metadata = {
  title: 'Panduan penggunaan · Verval Sertifikasi Guru',
  description: 'Tata cara mengunggah dan memverifikasi dokumen sertifikasi guru Pendidikan Agama Islam secara daring.',
}

async function ambilPengguna() {
  const jar = await cookies()
  const token = jar.get('sesi')?.value
  if (!token) return null
  const sesi = await bacaSesi(token)
  if (!sesi) return null
  if (sesi.tipe === 'admin') {
    const admin = await prisma.admin.findUnique({
      where: { id: sesi.pemilikId },
      select: { id: true, nama: true, email: true, aktif: true },
    })
    if (!admin || !admin.aktif) return null
    return {
      peran: 'Admin' as const,
      nama: admin.nama,
      href: '/admin',
      label: 'Ke Dashboard Admin',
      tautan: [
        { href: '/admin', teks: 'Beranda admin', ikon: 'dokumen' as const },
        { href: '/admin/akun', teks: 'Akun saya', ikon: 'akun' as const },
      ],
    }
  }
  if (sesi.tipe === 'guru') {
    const guru = await prisma.guru.findUnique({
      where: { id: sesi.pemilikId },
      select: { id: true, nama: true, aktif: true },
    })
    if (!guru || !guru.aktif) return null
    return {
      peran: 'Guru' as const,
      nama: guru.nama,
      href: '/dokumen',
      label: 'Ke Dokumen Saya',
      tautan: [
        { href: '/dokumen', teks: 'Dokumen saya', ikon: 'dokumen' as const },
        { href: '/profil', teks: 'Profil & kata sandi', ikon: 'profil' as const },
      ],
    }
  }
  return null
}

export default async function PanduanLayout({ children }: { children: ReactNode }) {
  const pengguna = await ambilPengguna()

  return (
    <>
      <header className="panduan-kepala">
        <div className="panduan-kepala__isi">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={38} height={34} />
          <div className="panduan-kepala__teks">
            <Tautan href="/panduan" className="panduan-kepala__link">
              <b>Verval Sertifikasi Guru</b>
              <span>Panduan penggunaan</span>
            </Tautan>
          </div>
          {pengguna ? (
            <>
              <Tautan className="tombol tombol--kecil" href={pengguna.href}>
                {pengguna.label}
              </Tautan>
              <MenuProfil nama={pengguna.nama} peran={pengguna.peran} tautan={pengguna.tautan} />
            </>
          ) : (
            <>
              <Tautan className="tombol tombol--kecil" href="/masuk">
                Masuk
              </Tautan>
              <PilihTema ringkas />
            </>
          )}
        </div>
      </header>

      <div className="panduan-tata-letak">
        <PanduanSidebarDesktop pdf={<TombolPdf kelas="panduan-pdf--sisi" />} />
        <main className="panduan-doc">
          <PanduanMobileFold pdf={<TombolPdf kelas="panduan-pdf--sisi" />} />
          {children}
        </main>
      </div>

      <KakiHalaman kelas="kaki-halaman--panduan" />
    </>
  )
}
