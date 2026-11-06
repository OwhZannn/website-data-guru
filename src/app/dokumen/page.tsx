import { halamanGuru } from '@/lib/halaman'
import { prisma } from '@/lib/db'
import { hitungStatusGuru } from '@/lib/status'
import { daftarRiwayatDokumen } from '@/lib/riwayat'
import { periodeTerlihatGuru, pilihPeriode } from '@/lib/pilihPeriode'
import PilihPeriode from '@/components/PilihPeriode'
import { tanggalLokal } from '@/lib/waktu'
import KartuDokumen from '@/components/KartuDokumen'
import Kepala from '@/components/Kepala'
import KartuProgres from '@/components/KartuProgres'
import { dokumenWajib, profilLengkap, TUGAS } from '@/lib/syarat'
import PilihTugas from '@/components/PilihTugas'

export const dynamic = 'force-dynamic'

export default async function Dokumen({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const guru = await halamanGuru()
  const sp = await searchParams

  // Hanya periode milik guru ini (plus periode saat ini); id asing jatuh ke bawaan.
  const daftarPeriode = await periodeTerlihatGuru(guru.id)
  const periode = pilihPeriode(daftarPeriode, sp.periode)
  const dibuka = periode?.dibuka ?? false
  const adaDibuka = daftarPeriode.some((p) => p.dibuka)
  // Guru hanya melihat dokumen yang wajib baginya menurut profil (status kepegawaian dan tugas tambahan).
  const lengkapProfil = profilLengkap(guru)
  const dokumen = periode
    ? dokumenWajib(await prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true }, orderBy: { urutan: 'asc' } }), guru)
    : []
  const baris = periode ? await prisma.dokumenGuru.findMany({ where: { periodeId: periode.id, guruId: guru.id } }) : []
  const status = hitungStatusGuru(dokumen, baris, guru)
  const riwayat = await Promise.all(dokumen.map((d) => daftarRiwayatDokumen(guru.id, d.id)))

  // Dokumen yang ditolak tampil paling atas supaya langsung diperbaiki.
  const URUT: Record<string, number> = { DITOLAK: 0, BELUM: 1, MENUNGGU: 2, SAH: 3 }
  const kartu = dokumen
    .map((d, i) => ({ d, b: baris.find((x) => x.dokumenId === d.id), r: riwayat[i] }))
    .sort((x, y) => (URUT[x.b?.status ?? 'BELUM'] ?? 9) - (URUT[y.b?.status ?? 'BELUM'] ?? 9))
  const jumlahTolak = baris.filter((b) => b.status === 'DITOLAK' && dokumen.some((d) => d.id === b.dokumenId)).length
  const jumlahTunggu = baris.filter((b) => b.status === 'MENUNGGU' && dokumen.some((d) => d.id === b.dokumenId)).length
  const keterangan = status.jumlahWajib > 0 && status.jumlahSah === status.jumlahWajib
    ? 'Semua dokumen sudah sah. Terima kasih.'
    : [jumlahTolak && `${jumlahTolak} perlu diperbaiki`, jumlahTunggu && `${jumlahTunggu} sedang diperiksa`].filter(Boolean).join(' · ')

  return (
    <>
      <Kepala sub={guru.nama} aksi={<a href="/profil">Profil &amp; kata sandi</a>} />
      <main className="dua">
        <div className="dua-kiri">
          <h1>Dokumen Saya</h1>
          {!adaDibuka && <p role="status" className="info">Masa pengunggahan sedang ditutup.</p>}
          {periode && <PilihPeriode daftar={daftarPeriode} dipilih={periode.id} />}
          {periode && !dibuka && adaDibuka && <p role="status" className="info">Periode ini sudah ditutup; hanya dapat dilihat.</p>}
          {!lengkapProfil && (
            <div className="info" role="status">
              <p style={{ margin: '0 0 8px' }}>Lengkapi profil Anda dulu. Dokumen yang perlu diunggah ditentukan dari jabatan dan status kepegawaian Anda.</p>
              <a className="tombol" href="/profil">Lengkapi profil</a>
            </div>
          )}
          {periode && dokumen.length > 0 && (
            <>
              <p className="redup" style={{ margin: '0 0 8px' }}>{periode.nama}</p>
              <KartuProgres sah={status.jumlahSah} wajib={status.jumlahWajib} keterangan={keterangan || undefined} />
            </>
          )}
          {lengkapProfil && (
            <PilihTugas awal={Object.fromEntries(TUGAS.map(([k]) => [k, guru[k]])) as Record<(typeof TUGAS)[number][0], boolean>} terkunci={!dibuka} />
          )}
        </div>
        {periode && dokumen.length > 0 && (
          <div className="dua-kanan">
            {status.lengkap && (
              <section className="siaga" aria-label="Langkah berikutnya">
                <h2>Berkas Anda sudah lulus verval.</h2>
                <p style={{ margin: 0 }}>Langkah berikutnya: unggah berkas yang sama ke aplikasi SIAGA, lalu cetak SKMT dan SPTJM.</p>
                <ol>
                  <li>Masuk ke aplikasi SIAGA.</li>
                  <li>Unggah setiap berkas di bawah ini. Semuanya sudah dinyatakan sah.</li>
                  <li>Cetak SKMT dan SPTJM dari SIAGA.</li>
                </ol>
              </section>
            )}
            {kartu.map(({ d, b, r }) => (
              <KartuDokumen
                key={d.id}
                dokumenId={d.id}
                nama={d.nama}
                status={b?.status ?? 'BELUM'}
                alasan={b?.alasan ?? null}
                namaFile={b?.namaFile ?? null}
                bolehUnggah={dibuka && lengkapProfil}
                riwayat={r.map((x) => ({
                  id: x.id,
                  aksi: x.aksi,
                  alasan: x.alasan,
                  waktuTeks: tanggalLokal(x.waktu),
                }))}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
