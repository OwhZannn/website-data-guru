'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTerpasang } from '@/lib/terpasang'
import { JABATAN, STATUS_PEGAWAI, type ProfilGuru } from '@/lib/syarat'
import { PETUNJUK } from '@/lib/petunjukIsian'

/** Formulir profil guru. Guru menyimpan lewat /api/profil; admin lewat /api/admin/guru (aksi profil). */
export default function FormProfil(p: {
  awal: ProfilGuru
  guruId?: string
  setelahSimpan?: string
  onSelesai?: () => void
  anak?: React.ReactNode
}) {
  const router = useRouter()
  const terpasang = useTerpasang()
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')
  const [ok, setOk] = useState(false)
  const admin = p.guruId !== undefined
  const a = p.awal
  const [statusPegawai, setStatusPegawai] = useState(a.statusPegawai ?? 'PNS')

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const profil: Record<string, unknown> = {
      nama: String(f.get('nama') ?? ''),
      asalSekolah: String(f.get('asalSekolah') ?? ''),
      statusPegawai: String(f.get('statusPegawai') ?? ''),
      jabatan: String(f.get('jabatan') ?? 'GURU'),
      tahunSertifikasi: String(f.get('tahunSertifikasi') ?? ''),
      sertifikasiBaru: f.get('sertifikasiBaru') === 'on',
    }
    if (admin) {
      if (f.get('nip')) profil.nip = String(f.get('nip'))
      if (f.get('nik')) profil.nik = String(f.get('nik'))
    }
    setSibuk(true); setPesan(''); setOk(false)
    try {
      const r = await fetch(admin ? '/api/admin/guru' : '/api/profil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin ? { aksi: 'profil', guruId: p.guruId, profil } : profil),
      })
      const j = await r.json().catch(() => null)
      if (r.ok && j?.ok) {
        setOk(true)
        if (p.onSelesai) p.onSelesai()
        if (p.setelahSimpan) router.push(p.setelahSimpan)
        router.refresh()
      } else if (r.status === 401) setPesan('Sesi berakhir. Silakan masuk lagi.')
      else setPesan(j?.pesan ?? 'Terjadi kesalahan. Coba lagi.')
    } catch {
      setPesan('Koneksi terputus. Periksa jaringan Anda lalu coba lagi.')
    }
    setSibuk(false)
  }

  return (
    <form method="post" onSubmit={kirim} className="panel profil profil--ringkas">
      {/* Baris 1: Nama lengkap (dengan gelar) */}
      <label htmlFor="nama-profil">Nama lengkap (dengan gelar)
        <input id="nama-profil" name="nama" defaultValue={a.nama ?? ''} required maxLength={200} placeholder={PETUNJUK.nama.contoh} />
      </label>
      <small className="redup bantuan">{PETUNJUK.nama.bantuan}</small>

      {/* Baris 2: Status kepegawaian & NIP/NIK (Satu-satunya tempat untuk status kepegawaian) */}
      <div className="profil-dua">
        <label htmlFor="status-pegawai">Status kepegawaian
          <select
            id="status-pegawai"
            name="statusPegawai"
            value={statusPegawai}
            onChange={(e) => setStatusPegawai(e.target.value)}
            required
          >
            <option value="" disabled>Pilih…</option>
            {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <small className="redup bantuan">{PETUNJUK.statusPegawai.bantuan}</small>
        </label>

        {statusPegawai === 'NON_ASN' ? (
          <label htmlFor="kolom-nik">NIK
            <input
              id="kolom-nik"
              name="nik"
              defaultValue={a.nik ?? a.username ?? ''}
              disabled={!admin}
              readOnly={!admin}
              inputMode="numeric"
              required
              placeholder={PETUNJUK.nik.contoh}
            />
            <small className="redup bantuan">{PETUNJUK.nik.bantuan}</small>
          </label>
        ) : (
          <label htmlFor="kolom-nip">NIP
            <input
              id="kolom-nip"
              name="nip"
              defaultValue={a.nip ?? a.username ?? ''}
              disabled={!admin}
              readOnly={!admin}
              inputMode="numeric"
              required
              placeholder={PETUNJUK.nip.contoh}
            />
            <small className="redup bantuan">{PETUNJUK.nip.bantuan}</small>
          </label>
        )}
      </div>

      {/* Baris 3: Asal sekolah & Tahun sertifikasi */}
      <div className="profil-dua">
        <div>
          <label htmlFor="asal-sekolah">Asal sekolah
            <input id="asal-sekolah" name="asalSekolah" defaultValue={a.asalSekolah ?? ''} required maxLength={200} placeholder={PETUNJUK.asalSekolah.contoh} />
          </label>
          <small className="redup bantuan">{PETUNJUK.asalSekolah.bantuan}</small>
        </div>
        <div>
          <label htmlFor="tahun-sertifikasi">Tahun sertifikasi
            <input id="tahun-sertifikasi" name="tahunSertifikasi" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={a.tahunSertifikasi ?? ''} required placeholder={PETUNJUK.tahunSertifikasi.contoh} />
          </label>
          <small className="redup bantuan">{PETUNJUK.tahunSertifikasi.bantuan}</small>
        </div>
      </div>

      {/* Baris 4: Jabatan sebagai segmen dua opsi satu baris */}
      <fieldset className="profil-ringkas-fieldset">
        <legend>Jabatan</legend>
        <div className="pilihan-dua pilihan-dua--ringkas">
          {JABATAN.map(([v, l]) => (
            <label className="centang centang--ringkas" key={v}>
              <input type="radio" name="jabatan" value={v} defaultChecked={(a.jabatan ?? 'GURU') === v} />
              <span>{l}{v === 'KEPSEK' && <small className="redup"> (SK &amp; program kepala sekolah, bukan jadwal dan absen)</small>}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Baris 5: Sertifikasi baru satu baris centang ringkas */}
      <div className="sertifikasi-ringkas">
        <label className="centang centang--ringkas">
          <input type="checkbox" name="sertifikasiBaru" defaultChecked={a.sertifikasiBaru} />
          <span>Guru sertifikasi baru <small className="redup">(menambah 4 berkas sertifikasi baru)</small></span>
        </label>
      </div>

      {/* Slot untuk Tugas tambahan bila ada di modal */}
      {p.anak}

      {/* Posisi tombol simpan di kaki modal tanpa tombol Batal yang berlebih */}
      {p.onSelesai ? (
        <div className="modal-profil__kaki">
          <button type="submit" className="tombol" disabled={sibuk || !terpasang}>
            {sibuk ? 'Menyimpan…' : 'Simpan profil'}
          </button>
        </div>
      ) : (
        <div className="aksi">
          <button type="submit" className="tombol" disabled={sibuk || !terpasang}>
            {sibuk ? 'Menyimpan…' : 'Simpan profil'}
          </button>
          {ok && <span className="ok" role="status">Profil tersimpan.</span>}
        </div>
      )}
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </form>
  )
}
