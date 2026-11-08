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
import KartuLangkahBerikutnya from '@/components/KartuLangkahBerikutnya'
import { dokumenWajib, profilLengkap, kolomProfilKurang, TUGAS } from '@/lib/syarat'
import PilihTugas from '@/components/PilihTugas'
import EmptyState from '@/components/ui/EmptyState'
import { FileX, CalendarOff } from 'lucide-react'

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

  // Kelompokkan berdasarkan status; dalam satu kelompok urutan admin dipertahankan.
  const semua = dokumen.map((d, i) => ({
    d,
    b: baris.find((x) => x.dokumenId === d.id),
    r: riwayat[i],
    st: (baris.find((x) => x.dokumenId === d.id)?.status ?? 'BELUM') as string,
  }))

  const perluTindakan = [
    ...semua.filter((x) => x.st === 'DITOLAK'),
    ...semua.filter((x) => x.st === 'BELUM'),
  ]
  const sedangDiperiksa = semua.filter((x) => x.st === 'MENUNGGU')
  const sudahSah = semua.filter((x) => x.st === 'SAH')

  const jumlahTolak = perluTindakan.filter((x) => x.st === 'DITOLAK').length
  const jumlahBelum = perluTindakan.filter((x) => x.st === 'BELUM').length
  const jumlahTunggu = sedangDiperiksa.length

  const keterangan = status.jumlahWajib > 0 && status.jumlahSah === status.jumlahWajib
    ? 'Semua dokumen sudah sah. Terima kasih.'
    : [jumlahTolak && `${jumlahTolak} perlu diperbaiki`, jumlahTunggu && `${jumlahTunggu} sedang diperiksa`].filter(Boolean).join(' · ')

  // SAH-only: buka details supaya tidak kolaps saat itu satu-satunya kelompok
  const sahSaja = perluTindakan.length === 0 && sedangDiperiksa.length === 0 && sudahSah.length > 0

  function renderKartu(item: typeof semua[number]) {
    return (
      <KartuDokumen
        key={item.d.id}
        dokumenId={item.d.id}
        nama={item.d.nama}
        status={item.b?.status ?? 'BELUM'}
        alasan={item.b?.alasan ?? null}
        namaFile={item.b?.namaFile ?? null}
        bolehUnggah={dibuka && lengkapProfil}
        riwayat={item.r.map((x) => ({
          id: x.id,
          aksi: x.aksi,
          alasan: x.alasan,
          waktuTeks: tanggalLokal(x.waktu),
        }))}
      />
    )
  }

  return (
    <>
      <Kepala sub={guru.nama} aksi={<a href="/profil">Profil &amp; kata sandi</a>} />
      <main className="dua">
        <div className="dua-kiri">
          <h1>Dokumen Saya</h1>
          {!adaDibuka && <p role="status" className="info">Masa pengunggahan sedang ditutup.</p>}
          {daftarPeriode.length === 0 && (
            <EmptyState
              ikon={<CalendarOff size={36} />}
              teks="Belum ada periode unggah yang tersedia."
            />
          )}
          {periode && <PilihPeriode daftar={daftarPeriode} dipilih={periode.id} />}
          {periode && !dibuka && adaDibuka && <p role="status" className="info">Periode ini sudah ditutup; hanya dapat dilihat.</p>}
          {!lengkapProfil && (
            <div className="info" role="status">
              <p className="mb-s2">Lengkapi profil Anda dulu. Dokumen yang perlu diunggah ditentukan dari jabatan dan status kepegawaian Anda.</p>
              <a className="tombol" href="/profil">Lengkapi profil</a>
            </div>
          )}
          {periode && dokumen.length > 0 && (
            <>
              <p className="redup mb-s2">{periode.nama}</p>
              <KartuProgres sah={status.jumlahSah} wajib={status.jumlahWajib} keterangan={keterangan || undefined} />
            </>
          )}
          {lengkapProfil && (
            <PilihTugas awal={Object.fromEntries(TUGAS.map(([k]) => [k, guru[k]])) as Record<(typeof TUGAS)[number][0], boolean>} terkunci={!dibuka} />
          )}
        </div>
        {periode && dokumen.length === 0 && lengkapProfil && (
          <div className="dua-kanan">
            <EmptyState
              ikon={<FileX size={36} />}
              teks="Tidak ada dokumen wajib untuk periode ini."
            />
          </div>
        )}
        {periode && dokumen.length > 0 && (
          <div className="dua-kanan">
            {status.lengkap ? (
              <section className="siaga" aria-label="Langkah berikutnya">
                <h2>Berkas Anda sudah lulus verval.</h2>
                <p className="mb-0">Langkah berikutnya: unggah berkas yang sama ke aplikasi SIAGA, lalu cetak SKMT dan SPTJM.</p>
                <ol>
                  <li>Masuk ke aplikasi SIAGA.</li>
                  <li>Unggah setiap berkas di bawah ini. Semuanya sudah dinyatakan sah.</li>
                  <li>Cetak SKMT dan SPTJM dari SIAGA.</li>
                </ol>
              </section>
            ) : (
              <KartuLangkahBerikutnya ditolak={jumlahTolak} belum={jumlahBelum} menunggu={jumlahTunggu} />
            )}

            {perluTindakan.length > 0 && (
              <section className="kelompok" id="perlu-tindakan" aria-label="Perlu tindakan">
                <h3 className="kelompok__judul kelompok__judul--tolak">Perlu tindakan</h3>
                {perluTindakan.map(renderKartu)}
              </section>
            )}

            {sedangDiperiksa.length > 0 && (
              <section className="kelompok" id="sedang-diperiksa" aria-label="Sedang diperiksa">
                <h3 className="kelompok__judul kelompok__judul--tunggu">Sedang diperiksa</h3>
                {sedangDiperiksa.map(renderKartu)}
              </section>
            )}

            {sudahSah.length > 0 && (
              <details id="sudah-sah" className="kelompok" open={sahSaja || undefined}>
                <summary className="kelompok__judul kelompok__judul--sah">
                  Sudah sah ({sudahSah.length})
                </summary>
                {sudahSah.map(renderKartu)}
              </details>
            )}
          </div>
        )}
      </main>
    </>
  )
}
