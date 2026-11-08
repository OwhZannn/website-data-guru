import { halamanAdmin } from '@/lib/halaman'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { ringkasanDasbor } from '@/lib/dasbor'
import { selisihWaktuIndonesia, ZONA_WAKTU } from '@/lib/waktu'
import BannerDrive from '@/components/BannerDrive'
import StatCard from '@/components/ui/StatCard'
import Section from '@/components/ui/Section'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import { FolderOpen, Clock, CheckCircle2, Activity, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

const LABEL_AKSI: Record<string, string> = {
  unggah: 'Diunggah',
  ganti_file: 'File diganti',
  sahkan: 'Disahkan',
  tolak: 'Ditolak',
  batalkan: 'Keputusan dibatalkan',
  buka_periode: 'Periode dibuka',
  tutup_periode: 'Periode ditutup',
  ubah_daftar_dokumen: 'Daftar dokumen diubah',
  impor_guru: 'Data guru diimpor',
  buat_admin: 'Admin dibuat',
  ubah_profil: 'Profil diubah',
  tambah_guru: 'Guru ditambah',
  daftar_guru: 'Guru mendaftar',
  setujui_guru: 'Guru disetujui',
  tolak_daftar: 'Pendaftaran ditolak',
}

const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'short', timeStyle: 'short' }).format(d)

export default async function BerandaAdmin({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  await halamanAdmin()
  const sp = await searchParams
  const daftarPeriode = await semuaPeriode()
  const periode = pilihPeriode(daftarPeriode, sp.periode)

  if (!periode) {
    return (
      <>
        <BannerDrive />
        <h1 className="mt-s4">Beranda Admin</h1>
        <EmptyState
          ikon={<FolderOpen size={36} />}
          teks="Belum ada periode. Buat periode untuk mulai mengelola dokumen guru."
          aksi={<a className="tombol" href="/admin/periode">Buat periode</a>}
        />
      </>
    )
  }

  const data = await ringkasanDasbor(periode.id)
  const pq = `periode=${periode.id}`
  const totalGuru = data.jumlahGuruAktif
  const persen = totalGuru > 0 ? Math.round((data.statusGuru.lengkap / totalGuru) * 100) : 0

  // Buat map guruId dari antrean untuk link aktivitas
  const guruIdDariAntrean = new Map(data.antrean.map((x) => [x.namaGuru, x.guruId]))

  return (
    <>
      <BannerDrive />
      <h1 className="mt-s4">Beranda Admin</h1>
      <p className="redup mb-s3">Periode: <strong className="redup-teks">{periode.nama}</strong></p>

      {/* Baris stat cards */}
      <div className="stat-baris">
        <StatCard nilai={totalGuru} label="Total guru aktif" href={`/admin/guru?${pq}`} />
        <StatCard nilai={data.statusGuru.lengkap} label="Lengkap" warna="sah" href={`/admin/guru?status=lengkap&${pq}`} />
        <StatCard nilai={data.statusGuru.perluDicek} label="Menunggu diperiksa" warna="tunggu" href={`/admin/guru?status=perlu-dicek&${pq}`} />
        <StatCard nilai={data.statusGuru.adaDitolak} label="Ada yang ditolak" warna="tolak" href={`/admin/guru?status=ada-ditolak&${pq}`} />
        <StatCard nilai={data.statusGuru.belumMulai} label="Belum mulai" warna="belum" href={`/admin/guru?status=belum-mulai&${pq}`} />
      </div>

      {/* Progres periode */}
      <Section judul="Progres periode">
        <ProgressBar
          segmen={[
            { warna: 'sah', nilai: data.statusGuru.lengkap, maks: totalGuru },
            { warna: 'tunggu', nilai: data.statusGuru.perluDicek, maks: totalGuru },
            { warna: 'tolak', nilai: data.statusGuru.adaDitolak, maks: totalGuru },
            { warna: 'belum', nilai: data.statusGuru.belumMulai, maks: totalGuru },
          ]}
        />
        <p className="progres-periode">{persen}% lengkap ({data.statusGuru.lengkap} dari {totalGuru} guru)</p>
      </Section>

      {/* Dua kolom tengah */}
      <div className="dua-kolom">
        {/* Antrean pemeriksaan */}
        <Section
          judul="Antrean pemeriksaan"
          aksi={
            data.totalAntrean > 0
              ? <a href="/admin/antrean" className="tautan-kecil">Lihat semua ({data.totalAntrean})</a>
              : undefined
          }
        >
          {data.antrean.length === 0 ? (
            <EmptyState ikon={<CheckCircle2 size={28} />} teks="Tidak ada dokumen menunggu pemeriksaan." />
          ) : (
            <table className="tabel-antrean">
              <thead>
                <tr>
                  <th>Guru</th>
                  <th>Dokumen</th>
                  <th><Clock size={12} aria-hidden="true" /><span className="sr-only">Menunggu sejak</span></th>
                </tr>
              </thead>
              <tbody>
                {data.antrean.map((item) => (
                  <tr key={item.dokumenGuruId}>
                    <td>
                      <a className="tautan-nama" href={`/admin/guru/${item.guruId}`}>{item.namaGuru}</a>
                    </td>
                    <td>{item.namaDokumen}</td>
                    <td className="redup nowrap">
                      {selisihWaktuIndonesia(item.menungguSejak)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Kolom kanan: persetujuan + aktivitas */}
        <div>
          {/* Perlu persetujuan */}
          {data.perluPersetujuan > 0 && (
            <div className="kartu-persetujuan mb-s4">
              <h2>Perlu persetujuan</h2>
              <p className="mb-s3">
                <strong>{data.perluPersetujuan}</strong> guru belum disetujui dan belum bisa mengakses sistem.
              </p>
              <a className="tombol" href={`/admin/guru?status=menunggu&${pq}`}>Tinjau pendaftaran</a>
            </div>
          )}

          {/* Aktivitas terbaru */}
          <Section judul="Aktivitas terbaru">
            {data.aktivitasTerbaru.length === 0 ? (
              <EmptyState ikon={<Activity size={28} />} teks="Belum ada aktivitas." />
            ) : (
              <ul className="aktivitas">
                {data.aktivitasTerbaru.map((a) => {
                  const guruId = a.namaGuru ? guruIdDariAntrean.get(a.namaGuru) : undefined
                  return (
                    <li key={a.id}>
                      <span className="aktivitas__waktu">{waktuWita(a.waktu)}</span>
                      <span className="aktivitas__teks">
                        {LABEL_AKSI[a.aksi] ?? a.aksi}
                        {a.namaGuru && (
                          <> — {guruId
                            ? <a href={`/admin/guru/${guruId}`}>{a.namaGuru}</a>
                            : <span>{a.namaGuru}</span>
                          }</>
                        )}
                        {a.namaDokumen ? <> ({a.namaDokumen})</> : null}
                        {' '}oleh {a.namaPelaku}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Per dokumen */}
      <Section
        judul="Per dokumen"
        aksi={
          <details className="unduh-rekap">
            <summary>Unduh rekap</summary>
            <div className="unduh-rekap__menu">
              <a href={`/api/admin/rekap?periodeId=${periode.id}&format=xlsx`}>Unduh rekap XLSX</a>
              <a href={`/api/admin/rekap?periodeId=${periode.id}&format=csv`}>Unduh rekap CSV</a>
            </div>
          </details>
        }
      >
        {data.perDokumen.length === 0 ? (
          <EmptyState ikon={<FileText size={28} />} teks="Belum ada dokumen pada periode ini." aksi={<a className="tombol-garis" href="/admin/periode">Atur dokumen periode</a>} />
        ) : (
          data.perDokumen.map((d) => {
            const total = totalGuru || 1
            const belum = d.belum < 0 ? 0 : d.belum
            return (
              <div key={d.id} className="per-dokumen-baris">
                <div className="per-dokumen-nama">{d.nama}</div>
                <ProgressBar
                  segmen={[
                    { warna: 'sah', nilai: d.sah, maks: total },
                    { warna: 'tunggu', nilai: d.menunggu, maks: total },
                    { warna: 'tolak', nilai: d.ditolak, maks: total },
                    { warna: 'belum', nilai: belum, maks: total },
                  ]}
                />
                <div className="per-dokumen-angka">
                  {d.sah} SAH · {d.menunggu} menunggu · {d.ditolak} ditolak · {belum} belum
                </div>
              </div>
            )
          })
        )}
      </Section>
    </>
  )
}
