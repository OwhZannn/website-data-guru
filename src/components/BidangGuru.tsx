'use client'
import { useEffect, useRef, useState } from 'react'
import { JABATAN, STATUS_PEGAWAI } from '@/lib/syarat'
import { PETUNJUK, bantuanIdentitas } from '@/lib/petunjukIsian'

export type NilaiAwalGuru = {
  nama?: string | null
  statusPegawai?: string | null
  nip?: string | null
  nik?: string | null
  asalSekolah?: string | null
  tahunSertifikasi?: number | null
  jabatan?: string | null
  sertifikasiBaru?: boolean
}

/**
 * Isian data guru yang dipakai bersama oleh formulir Tambah guru, Daftar, dan Koreksi/Profil
 * supaya urutan, label, bantuan, dan tata letaknya selalu sama. Isian tak terkontrol (name = kunci data);
 * hanya status kepegawaian yang dipantau untuk menukar kolom NIP dan NIK.
 */
export default function BidangGuru(p: {
  awal?: NilaiAwalGuru
  /** Nilai awal status; kosong berarti guru harus memilih dulu. */
  statusAwal?: string
  /** Admin dan pembuatan akun boleh mengisi NIP/NIK; guru hanya membaca. */
  identitasBisaDiubah: boolean
  asalOpsional?: boolean
  denganSertifikasiBaru?: boolean
}) {
  const a = p.awal ?? {}
  // Format NIP/NIK hanya diperiksa di peramban untuk guru baru; data lama divalidasi server hanya bila diubah.
  const periksaFormat = p.identitasBisaDiubah && p.awal === undefined
  const [status, setStatus] = useState(p.statusAwal ?? a.statusPegawai ?? '')
  const nonAsn = status === 'NON_ASN'

  // Di HP yang lambat, status bisa dipilih sebelum JavaScript siap; ambil pilihan itu saat siap.
  const pilihStatus = useRef<HTMLSelectElement>(null)
  useEffect(() => {
    const v = pilihStatus.current?.value
    if (v) setStatus(v)
  }, [])

  const idDinonaktifkan = !p.identitasBisaDiubah || (!nonAsn && status === '')
  const bantuanId = p.identitasBisaDiubah
    ? bantuanIdentitas(status, nonAsn)
    : nonAsn ? PETUNJUK.nik.bantuan : PETUNJUK.nip.bantuan

  return (
    <>
      <div>
        <label htmlFor="nama-profil">Nama lengkap (dengan gelar)
          <input id="nama-profil" name="nama" defaultValue={a.nama ?? ''} required maxLength={200} placeholder={PETUNJUK.nama.contoh} />
        </label>
        <small className="redup bantuan">{PETUNJUK.nama.bantuan}</small>
      </div>

      <div className="profil-dua">
        <div>
          <label htmlFor="status-pegawai">Status kepegawaian
            <select
              id="status-pegawai"
              ref={pilihStatus}
              name="statusPegawai"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              <option value="" disabled>Pilih…</option>
              {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <small className="redup bantuan">{PETUNJUK.statusPegawai.bantuan}</small>
        </div>

        <div>
          {nonAsn ? (
            <label key="nik" htmlFor="kolom-nik">NIK
              <input
                id="kolom-nik"
                name="nik"
                defaultValue={a.nik ?? ''}
                disabled={idDinonaktifkan}
                readOnly={!p.identitasBisaDiubah}
                inputMode="numeric"
                pattern={periksaFormat ? '[0-9 ]{16,20}' : undefined}
                required={!idDinonaktifkan}
                placeholder={PETUNJUK.nik.contoh}
              />
            </label>
          ) : (
            <label key="nip" htmlFor="kolom-nip">NIP
              <input
                id="kolom-nip"
                name="nip"
                defaultValue={a.nip ?? ''}
                disabled={idDinonaktifkan}
                readOnly={!p.identitasBisaDiubah}
                inputMode="numeric"
                pattern={periksaFormat ? '[0-9 ]{18,24}' : undefined}
                required={!idDinonaktifkan}
                placeholder={PETUNJUK.nip.contoh}
              />
            </label>
          )}
          <small className="redup bantuan">{bantuanId}</small>
        </div>
      </div>

      <div className="profil-dua">
        <div>
          <label htmlFor="asal-sekolah">
            Asal sekolah{p.asalOpsional && <> <small className="redup">(boleh diisi nanti)</small></>}
            <input
              id="asal-sekolah"
              name="asalSekolah"
              defaultValue={a.asalSekolah ?? ''}
              required={!p.asalOpsional}
              maxLength={200}
              placeholder={PETUNJUK.asalSekolah.contoh}
            />
          </label>
          <small className="redup bantuan">{PETUNJUK.asalSekolah.bantuan}</small>
        </div>
        <div>
          <label htmlFor="tahun-sertifikasi">Tahun sertifikasi
            <input
              id="tahun-sertifikasi"
              name="tahunSertifikasi"
              type="number"
              inputMode="numeric"
              min={1990}
              max={2100}
              defaultValue={a.tahunSertifikasi ?? ''}
              required
              placeholder={PETUNJUK.tahunSertifikasi.contoh}
            />
          </label>
          <small className="redup bantuan">{PETUNJUK.tahunSertifikasi.bantuan}</small>
        </div>
      </div>

      <fieldset className="profil-ringkas-fieldset">
        <legend>Jabatan</legend>
        <div className="pilihan-dua pilihan-dua--ringkas">
          {JABATAN.map(([v, l]) => (
            <label className="centang centang--ringkas" key={v}>
              <input type="radio" name="jabatan" value={v} defaultChecked={(a.jabatan ?? 'GURU') === v} />
              <span className="centang__teks">
                {l}
                {v === 'KEPSEK' && <small className="redup">{PETUNJUK.jabatan.bantuan}</small>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {p.denganSertifikasiBaru && (
        <div className="sertifikasi-ringkas">
          <label className="centang centang--ringkas">
            <input type="checkbox" name="sertifikasiBaru" defaultChecked={a.sertifikasiBaru ?? false} />
            <span className="centang__teks">
              Guru sertifikasi baru
              <small className="redup">Menambah 4 berkas sertifikasi baru</small>
            </span>
          </label>
        </div>
      )}
    </>
  )
}
