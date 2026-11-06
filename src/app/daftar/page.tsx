import FormGuruBaru from '@/components/FormGuruBaru'

export const metadata = { title: 'Buat akun guru · Verval Sertifikasi Guru' }

export default function Daftar() {
  return (
    <main className="masuk">
      <div className="masuk-kartu lebar-daftar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-kemenag.png" alt="Logo Kementerian Agama" width={72} height={64} />
        <h1>Buat akun guru</h1>
        <p className="sub">Isi data Anda. Akun bisa dipakai setelah disetujui admin.</p>
        <FormGuruBaru mode="daftar" />
        <p className="masuk-daftar">Sudah punya akun? <a href="/masuk">Masuk</a></p>
      </div>
    </main>
  )
}
