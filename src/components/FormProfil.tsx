'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { KunciTugas, ProfilGuru } from '@/lib/syarat'
import BidangGuru from './BidangGuru'
import RangkaForm from './RangkaForm'
import PilihTugasPil from './PilihTugasPil'

/**
 * Formulir profil guru. Guru menyimpan lewat /api/profil; admin lewat /api/admin/guru (aksi profil).
 * Bila `tugas` diberikan (modal koreksi admin), pilihan tugas tambahan ikut dikirim dan baru tersimpan
 * saat tombol simpan ditekan, bersama isian profil.
 */
export default function FormProfil(p: {
  awal: ProfilGuru
  guruId?: string
  setelahSimpan?: string
  onSelesai?: () => void
  tugas?: Record<KunciTugas, boolean>
}) {
  const router = useRouter()
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState('')
  const [ok, setOk] = useState(false)
  const [tugas, setTugas] = useState(p.tugas)
  const admin = p.guruId !== undefined
  const a = p.awal

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
        body: JSON.stringify(admin ? { aksi: 'profil', guruId: p.guruId, profil, tugas } : profil),
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
    <RangkaForm
      dalamModal={Boolean(p.onSelesai)}
      onSubmit={kirim}
      labelKirim="Simpan profil"
      sibuk={sibuk}
      pesan={pesan}
      sukses={ok ? 'Profil tersimpan.' : undefined}
    >
      <BidangGuru awal={a} identitasBisaDiubah={admin} denganSertifikasiBaru />
      {tugas && <PilihTugasPil nilai={tugas} onUbah={(k, v) => setTugas((t) => (t ? { ...t, [k]: v } : t))} disabled={sibuk} />}
    </RangkaForm>
  )
}
