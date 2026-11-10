'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTerpasang } from '@/lib/terpasang'
import { JABATAN, STATUS_PEGAWAI, type ProfilGuru } from '@/lib/syarat'
import { PETUNJUK } from '@/lib/petunjukIsian'

/** Formulir profil guru. Guru menyimpan lewat /api/profil; admin lewat /api/admin/guru (aksi profil). */
export default function FormProfil(p: { awal: ProfilGuru; guruId?: string; setelahSimpan?: string; onSelesai?: () => void }) {
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
      {admin ? (
        <div className="profil-dua">
          <div>
            <label htmlFor="nama-profil">Nama lengkap (dengan gelar)
              <input id="nama-profil" name="nama" defaultValue={a.nama ?? ''} required maxLength={200} placeholder={PETUNJUK.nama.contoh} />
            </label>
            <small className="redup bantuan">{PETUNJUK.nama.bantuan}</small>
          </div>
          <div>
            {statusPegawai === 'NON_ASN' ? (
              <label htmlFor="kolom-nik">NIK
                <input
                  id="kolom-nik"
                  name="nik"
                  defaultValue={a.nik ?? ''}
                  inputMode="numeric"
                  required
                  placeholder={PETUNJUK.nik.contoh}
                />
              </label>
            ) : (
              <label htmlFor="kolom-nip">NIP
                <input
                  id="kolom-nip"
                  name="nip"
                  defaultValue={a.nip ?? ''}
                  inputMode="numeric"
                  required
                  placeholder={PETUNJUK.nip.contoh}
                />
              </label>
            )}
            <small className="redup bantuan">
              {statusPegawai === 'NON_ASN' ? PETUNJUK.nik.bantuan : PETUNJUK.nip.bantuan}
            </small>
          </div>
        </div>
      ) : (
        <>
          <label htmlFor="nama-profil">Nama lengkap (dengan gelar)
            <input id="nama-profil" name="nama" defaultValue={a.nama ?? ''} required maxLength={200} placeholder={PETUNJUK.nama.contoh} />
          </label>
          <small className="redup bantuan">{PETUNJUK.nama.bantuan}</small>
        </>
      )}

      {/* Baris grid ringkas: Asal sekolah, Status kepegawaian, Tahun sertifikasi sebaris di layar lebar */}
      <div className="profil-tiga">
        <div>
          <label htmlFor="asal-sekolah">Asal sekolah
            <input id="asal-sekolah" name="asalSekolah" defaultValue={a.asalSekolah ?? ''} required maxLength={200} placeholder={PETUNJUK.asalSekolah.contoh} />
          </label>
          <small className="redup bantuan">{PETUNJUK.asalSekolah.bantuan}</small>
        </div>
        <div>
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
          </label>
          <small className="redup bantuan">{PETUNJUK.statusPegawai.bantuan}</small>
        </div>
        <div>
          <label htmlFor="tahun-sertifikasi">Tahun sertifikasi
            <input id="tahun-sertifikasi" name="tahunSertifikasi" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={a.tahunSertifikasi ?? ''} required placeholder={PETUNJUK.tahunSertifikasi.contoh} />
          </label>
          <small className="redup bantuan">{PETUNJUK.tahunSertifikasi.bantuan}</small>
        </div>
      </div>

      {/* Jabatan sebagai segmen dua pilihan satu baris */}
      <fieldset className="profil-ringkas-fieldset">
        <legend>Jabatan</legend>
        <div className="pilihan-dua pilihan-dua--ringkas">
          {JABATAN.map(([v, l]) => (
            <label className="centang centang--ringkas" key={v}>
              <input type="radio" name="jabatan" value={v} defaultChecked={(a.jabatan ?? 'GURU') === v} />
              <span>{l}</span>
            </label>
          ))}
        </div>
        <small className="redup bantuan">{PETUNJUK.jabatan.bantuan}</small>
      </fieldset>

      {/* Sertifikasi baru digabung satu baris centang ringkas */}
      <div className="sertifikasi-ringkas">
        <label className="centang centang--ringkas">
          <input type="checkbox" name="sertifikasiBaru" defaultChecked={a.sertifikasiBaru} />
          <span>Guru sertifikasi baru</span>
        </label>
        <small className="redup bantuan">Menambah 4 berkas: buku rekening, NUPTK/NPWP/KTP, ijazah, dan sertifikat pendidik.</small>
      </div>

      <div className="aksi">
        <button type="submit" disabled={sibuk || !terpasang}>{sibuk ? 'Menyimpan…' : 'Simpan profil'}</button>
        {ok && <span className="ok" role="status">Profil tersimpan.</span>}
      </div>
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </form>
  )
}
