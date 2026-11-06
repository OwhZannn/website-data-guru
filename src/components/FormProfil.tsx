'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTerpasang } from '@/lib/terpasang'
import { JABATAN, STATUS_PEGAWAI, type ProfilGuru } from '@/lib/syarat'

/** Formulir profil guru. Guru menyimpan lewat /api/profil; admin lewat /api/admin/guru (aksi profil). */
export default function FormProfil(p: { awal: ProfilGuru; guruId?: string; setelahSimpan?: string }) {
  const router = useRouter()
  const terpasang = useTerpasang()
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')
  const [ok, setOk] = useState(false)
  const admin = p.guruId !== undefined

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const profil = {
      asalSekolah: String(f.get('asalSekolah') ?? ''),
      statusPegawai: String(f.get('statusPegawai') ?? ''),
      jabatan: String(f.get('jabatan') ?? 'GURU'),
      tahunSertifikasi: String(f.get('tahunSertifikasi') ?? ''),
      sertifikasiBaru: f.get('sertifikasiBaru') === 'on',
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

  const a = p.awal
  return (
    <form method="post" onSubmit={kirim} className="panel profil">
      <label>Asal sekolah
        <input name="asalSekolah" defaultValue={a.asalSekolah ?? ''} required maxLength={200} placeholder="Contoh: SMA Negeri 1 Mataram" />
      </label>
      <fieldset>
        <legend>Jabatan</legend>
        <div className="pilihan-dua">
          {JABATAN.map(([v, l]) => (
            <label className="centang" key={v}>
              <input type="radio" name="jabatan" value={v} defaultChecked={(a.jabatan ?? 'GURU') === v} />
              <span>{l}{v === 'KEPSEK' && <small> (mengunggah SK dan program kepala sekolah, bukan jadwal dan absen sekolah)</small>}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="profil-dua">
        <label>Status kepegawaian
          <select name="statusPegawai" defaultValue={a.statusPegawai ?? ''} required>
            <option value="" disabled>Pilih…</option>
            {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Tahun sertifikasi
          <input name="tahunSertifikasi" type="number" inputMode="numeric" min={1990} max={2100} defaultValue={a.tahunSertifikasi ?? ''} required placeholder="Contoh: 2015" />
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
