'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTerpasang } from '@/lib/terpasang'
import { JABATAN, STATUS_PEGAWAI, type ProfilGuru } from '@/lib/syarat'
import { PETUNJUK } from '@/lib/petunjukIsian'

/** Formulir profil guru. Guru menyimpan lewat /api/profil; admin lewat /api/admin/guru (aksi profil). */
export default function FormProfil(p: { awal: ProfilGuru; guruId?: string; setelahSimpan?: string }) {
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
    <form method="post" onSubmit={kirim} className="panel profil">
      <label htmlFor="nama-profil">Nama lengkap (dengan gelar)
        <input id="nama-profil" name="nama" defaultValue={a.nama ?? ''} required maxLength={200} placeholder={PETUNJUK.nama.contoh} />
      </label>
      <small className="redup bantuan">{PETUNJUK.nama.bantuan}</small>

      {admin ? (
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
                defaultValue={a.nik ?? ''}
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
                defaultValue={a.nip ?? ''}
                inputMode="numeric"
                required
                placeholder={PETUNJUK.nip.contoh}
              />
              <small className="redup bantuan">{PETUNJUK.nip.bantuan}</small>
            </label>
          )}
        </div>
      ) : (
        (a.nip || a.nik || a.username) && (
          <>
            <label>{a.statusPegawai === 'NON_ASN' ? 'NIK' : 'NIP'}
              <input defaultValue={a.nip ?? a.nik ?? a.username ?? ''} disabled readOnly />
            </label>
            <small className="redup bantuan">
              {a.statusPegawai === 'NON_ASN' ? PETUNJUK.nik.bantuan : PETUNJUK.nip.bantuan}
            </small>
          </>
        )
      )}

      <label htmlFor="asal-sekolah">Asal sekolah
        <input id="asal-sekolah" name="asalSekolah" defaultValue={a.asalSekolah ?? ''} required maxLength={200} placeholder={PETUNJUK.asalSekolah.contoh} />
        <small className="redup bantuan">{PETUNJUK.asalSekolah.bantuan}</small>
      </label>
      <fieldset>
        <legend>Jabatan</legend>
        <div className="pilihan-dua">
          {JABATAN.map(([v, l]) => (
            <label className="centang" key={v}>
              <input type="radio" name="jabatan" value={v} defaultChecked={(a.jabatan ?? 'GURU') === v} />
              <span>{l}{v === 'KEPSEK' && <small className="redup"> ({PETUNJUK.jabatan.bantuan})</small>}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="profil-dua">
        {!admin && (
          <label htmlFor="status-pegawai">Status kepegawaian
            <select id="status-pegawai" name="statusPegawai" defaultValue={a.statusPegawai ?? ''} required>
              <option value="" disabled>Pilih…</option>
              {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <small className="redup bantuan">{PETUNJUK.statusPegawai.bantuan}</small>
          </label>
        )}
        <label htmlFor="tahun-sertifikasi">Tahun sertifikasi
          <input id="tahun-sertifikasi" name="tahunSertifikasi" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={a.tahunSertifikasi ?? ''} required placeholder={PETUNJUK.tahunSertifikasi.contoh} />
          <small className="redup bantuan">{PETUNJUK.tahunSertifikasi.bantuan}</small>
        </label>
      </div>

      <fieldset>
        <legend>Sertifikasi</legend>
        <label className="centang">
          <input type="checkbox" name="sertifikasiBaru" defaultChecked={a.sertifikasiBaru} />
          <span>Guru sertifikasi baru <small>(menambah unggahan buku rekening, NUPTK/NPWP/KTP, ijazah, sertifikat pendidik)</small></span>
        </label>
      </fieldset>


      <div className="aksi">
        <button type="submit" disabled={sibuk || !terpasang}>{sibuk ? 'Menyimpan…' : 'Simpan profil'}</button>
        {ok && <span className="ok" role="status">Profil tersimpan.</span>}
      </div>
      {pesan && <p className="galat" role="alert">{pesan}</p>}
    </form>
  )
}
