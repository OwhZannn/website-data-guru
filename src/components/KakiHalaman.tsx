import Tautan from '@/components/ui/Tautan'

/** Kaki tipis di semua halaman: tautan ke panduan penggunaan (publik). */
export default function KakiHalaman({ kelas = '' }: { kelas?: string }) {
  return (
    <footer className={`kaki-halaman ${kelas}`.trim()}>
      <Tautan href="/panduan">Panduan penggunaan</Tautan>
      <span aria-hidden="true">·</span>
      <span>Verval Sertifikasi Guru · Kementerian Agama</span>
    </footer>
  )
}
