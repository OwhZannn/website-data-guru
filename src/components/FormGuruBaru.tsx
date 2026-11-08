'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTerpasang } from '@/lib/terpasang'
import { JABATAN, STATUS_PEGAWAI } from '@/lib/syarat'

type AkunBaru = { nama: string; username: string; jenis: string; sandi: string }

/**
 * Formulir guru baru. `admin`: admin menambah guru (langsung aktif).
 * `daftar`: guru membuat akun sendiri (menunggu persetujuan admin).
 */
export default function FormGuruBaru({ mode }: { mode: 'admin' | 'daftar' }) {
  const router = useRouter()
  const terpasang = useTerpasang()
  const [status, setStatus] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')
  const [akun, setAkun] = useState<AkunBaru | null>(null)
  const [tersalin, setTersalin] = useState(false)
  const nonAsn = status === 'NON_ASN'
  // Di HP yang lambat, guru bisa memilih status sebelum JavaScript siap; ambil pilihan itu saat siap.
  const pilihStatus = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const v = pilihStatus.current?.value
    if (v) setStatus(v)
  }, [])

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
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
        form.reset()
        setStatus('')
        if (mode === 'admin') router.refresh()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else setPesan(j?.pesan ?? 'Terjadi kesalahan. Coba lagi.')
    } catch {
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
    }
    setSibuk(false)
  }

  return (
    <>
      {akun && (
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
          {mode === 'daftar' && <p><a href="/masuk">Kembali ke halaman masuk</a></p>}
        </section>
      )}

      <form method="post" onSubmit={kirim} className="panel profil">
        <label>Nama lengkap (dengan gelar)
          <input name="nama" required maxLength={200} placeholder="Contoh: Siti Rahmawati, S.Pd.I." />
        </label>
        <div className="profil-dua">
          <label>Status kepegawaian
            <select ref={pilihStatus} name="statusPegawai" value={status} onChange={(e) => setStatus(e.target.value)} required>
              <option value="" disabled>Pilih…</option>
              {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {nonAsn ? (
            <label key="nik">NIK
              <input name="nik" inputMode="numeric" pattern="[0-9 ]{16,20}" required placeholder="16 angka sesuai KTP" />
            </label>
          ) : (
            <label key="nip">NIP
              <input name="nip" inputMode="numeric" pattern="[0-9 ]{18,24}" required={status !== ''} disabled={status === ''}
                placeholder={status === '' ? 'Pilih status kepegawaian dulu' : '18 angka'} />
            </label>
          )}
        </div>
        <p className="redup bantuan bantuan-atas">
          {nonAsn ? 'Non ASN masuk memakai NIK sebagai username.' : 'PNS, PPPK, dan Paruh waktu masuk memakai NIP sebagai username.'}
        </p>
        <fieldset>
          <legend>Jabatan</legend>
          <div className="pilihan-dua">
            {JABATAN.map(([v, l]) => (
              <label className="centang" key={v}>
                <input type="radio" name="jabatan" value={v} defaultChecked={v === 'GURU'} />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="profil-dua">
          <label>Tahun sertifikasi
            <input name="tahunSertifikasi" type="number" inputMode="numeric" min={1990} max={2100} required placeholder="Contoh: 2015" />
          </label>
          <label>Asal sekolah <small className="redup">(boleh diisi nanti)</small>
            <input name="asalSekolah" maxLength={200} placeholder="Contoh: SMA Negeri 1 Mataram" />
          </label>
        </div>
        <div className="aksi">
          <button type="submit" disabled={sibuk || !terpasang}>
            {sibuk ? 'Menyimpan…' : mode === 'admin' ? 'Tambah guru' : 'Buat akun'}
          </button>
        </div>
        {pesan && <p className="galat" role="alert">{pesan}</p>}
      </form>
    </>
  )
}
