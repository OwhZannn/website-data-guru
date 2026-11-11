'use client'
import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Tautan from '@/components/ui/Tautan'
import BidangGuru from './BidangGuru'
import RangkaForm from './RangkaForm'

type AkunBaru = { nama: string; username: string; jenis: string; sandi: string }

/**
 * Formulir guru baru. `admin`: admin menambah guru (langsung aktif).
 * `daftar`: guru membuat akun sendiri (menunggu persetujuan admin).
 * Isiannya memakai BidangGuru yang sama dengan modal Koreksi profil. Di dalam modal (`onSelesai` ada), badan bergulir dan
 * tombol kirim tetap di kaki modal.
 */
export default function FormGuruBaru({
  mode,
  onSelesai,
}: {
  mode: 'admin' | 'daftar'
  onSelesai?: () => void
}) {
  const router = useRouter()
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')
  const [akun, setAkun] = useState<AkunBaru | null>(null)
  const [tersalin, setTersalin] = useState(false)
  const [versi, setVersi] = useState(0)
  const badan = useRef<HTMLDivElement>(null)

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const nonAsn = f.get('statusPegawai') === 'NON_ASN'
    const data = {
      nama: f.get('nama'), statusPegawai: f.get('statusPegawai'), jabatan: f.get('jabatan'),
      tahunSertifikasi: f.get('tahunSertifikasi'), asalSekolah: f.get('asalSekolah'),
      ...(nonAsn ? { nik: f.get('nik') } : { nip: f.get('nip') }),
    }
    setSibuk(true); setPesan(''); setAkun(null); setTersalin(false)
    try {
      const r = await fetch(mode === 'admin' ? '/api/admin/guru' : '/api/daftar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'admin' ? { aksi: 'tambah', data } : data),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        setAkun(j.akun)
        setVersi((v) => v + 1) // kosongkan isian dengan memasang ulang BidangGuru
        if (mode === 'admin') router.refresh()
        if (badan.current) badan.current.scrollTo({ top: 0, behavior: 'smooth' })
        else window.scrollTo({ top: 0, behavior: 'smooth' })
      } else setPesan(j?.pesan ?? 'Terjadi kesalahan. Coba lagi.')
    } catch {
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
    }
    setSibuk(false)
  }

  const banner = akun && (
    <section className="akun-baru" role="status" aria-label="Akun berhasil dibuat">
      <h2>{mode === 'admin' ? 'Guru berhasil ditambahkan.' : 'Akun berhasil dibuat.'}</h2>
      <p className="mb-0">
        {mode === 'admin'
          ? <>Berikan data masuk berikut kepada <b>{akun.nama}</b>.</>
          : <>Simpan data masuk berikut. Akun Anda baru bisa dipakai setelah <b>disetujui admin</b>.</>}
      </p>
      <dl>
        <dt>Username ({akun.jenis})</dt><dd><code data-testid="username-baru">{akun.username}</code></dd>
        <dt>Kata sandi</dt>
        <dd>
          <code data-testid="sandi-baru">{akun.sandi}</code>{' '}
          <button
            type="button"
            className="biasa"
            onClick={() => navigator.clipboard?.writeText(`Username: ${akun.username}\nKata sandi: ${akun.sandi}`)
              .then(() => setTersalin(true)).catch(() => {})}
          >{tersalin ? 'Tersalin' : 'Salin'}</button>
        </dd>
      </dl>
      <p><strong>Catat sekarang: kata sandi ini hanya tampil sekali.</strong> Kata sandi bisa diganti di menu Profil setelah masuk.</p>
      {mode === 'daftar' && <p><Tautan href="/masuk">Kembali ke halaman masuk</Tautan></p>}
    </section>
  )

  const dalamModal = Boolean(onSelesai)
  return (
    <>
      {!dalamModal && banner}
      <RangkaForm
        dalamModal={dalamModal}
        onSubmit={kirim}
        labelKirim={mode === 'admin' ? 'Tambah guru' : 'Buat akun'}
        sibuk={sibuk}
        pesan={pesan}
        atas={dalamModal ? banner : undefined}
        badanRef={badan}
      >
        <BidangGuru key={versi} statusAwal="" identitasBisaDiubah asalOpsional />
      </RangkaForm>
    </>
  )
}
