import { halamanAdmin } from '@/lib/halaman'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { ringkasanDasbor } from '@/lib/dasbor'
import { selisihWaktuIndonesia, ZONA_WAKTU } from '@/lib/waktu'
import BannerDrive from '@/components/BannerDrive'
import StatCard from '@/components/ui/StatCard'
import Section from '@/components/ui/Section'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import DataTable, { type Kolom } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { FolderOpen, CheckCircle2, Activity, FileText } from 'lucide-react'
import Tautan from '@/components/ui/Tautan'

export const dynamic = 'force-dynamic'

/** Antrean dan aktivitas di beranda dibatasi supaya halaman muat satu layar; daftar lengkap ada di halaman Antrean. */
const BATAS_BARIS = 5

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
          aksi={<Tautan className="tombol" href="/admin/periode">Buat periode</Tautan>}
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

  const kolomAntrean: Kolom<(typeof data.antrean)[number]>[] = [
    { id: 'guru', label: 'Guru', tanpaLabelPonsel: true, sel: (i) => <Tautan className="tautan-nama" href={`/admin/guru/${i.guruId}`} prefetch={false}>{i.namaGuru}</Tautan> },
    { id: 'dokumen', label: 'Dokumen', sel: (i) => i.namaDokumen },
    { id: 'sejak', label: 'Menunggu', kelas: 'nowrap redup', sel: (i) => selisihWaktuIndonesia(i.menungguSejak) },
  ]

  const kolomPerDokumen: Kolom<(typeof data.perDokumen)[number]>[] = [
    { id: 'nama', label: 'Dokumen', tanpaLabelPonsel: true, sel: (d) => <b>{d.nama}</b> },
    {
      id: 'progres', label: 'Progres',
      sel: (d) => (
        <ProgressBar
          segmen={[
            { warna: 'sah', nilai: d.sah, maks: totalGuru || 1 },
            { warna: 'tunggu', nilai: d.menunggu, maks: totalGuru || 1 },
            { warna: 'tolak', nilai: d.ditolak, maks: totalGuru || 1 },
            { warna: 'belum', nilai: Math.max(d.belum, 0), maks: totalGuru || 1 },
          ]}
        />
      ),
    },
    {
      id: 'rincian', label: 'Rincian', kelas: 'nowrap redup',
      sel: (d) => `${d.sah} sah · ${d.menunggu} menunggu · ${d.ditolak} ditolak · ${Math.max(d.belum, 0)} belum`,
    },
  ]

  const antreanTampil = data.antrean.slice(0, BATAS_BARIS)
  const aktivitasTampil = data.aktivitasTerbaru.slice(0, BATAS_BARIS)

  return (
    <div className="halaman-tabel beranda">
      <BannerDrive />
      <PageHeader
        judul="Beranda Admin"
        keterangan={<>Periode: <strong className="redup-teks">{periode.nama}</strong></>}
        aksi={(
          <details className="unduh-rekap">
            <summary>Unduh rekap</summary>
            <div className="unduh-rekap__menu">
              <a href={`/api/admin/rekap?periodeId=${periode.id}&format=xlsx`}>Unduh rekap XLSX</a>
              <a href={`/api/admin/rekap?periodeId=${periode.id}&format=csv`}>Unduh rekap CSV</a>
            </div>
          </details>
        )}
      />

      <div className="stat-baris">
        <StatCard nilai={totalGuru} label="Total guru aktif" href={`/admin/guru?${pq}`} />
        <StatCard nilai={data.statusGuru.lengkap} label="Lengkap" warna="sah" href={`/admin/guru?status=lengkap&${pq}`} />
        <StatCard nilai={data.statusGuru.perluDicek} label="Menunggu diperiksa" warna="tunggu" href={`/admin/guru?status=perlu-dicek&${pq}`} />
        <StatCard nilai={data.statusGuru.adaDitolak} label="Ada yang ditolak" warna="tolak" href={`/admin/guru?status=ada-ditolak&${pq}`} />
        <StatCard nilai={data.statusGuru.belumMulai} label="Belum mulai" warna="belum" href={`/admin/guru?status=belum-mulai&${pq}`} />
      </div>

      <div className="beranda__grid">
        <div className="beranda__kolom">
          <Section kartu judul="Progres periode" aksi={<span className="progres-periode">{persen}% lengkap ({data.statusGuru.lengkap} dari {totalGuru} guru)</span>}>
            <ProgressBar
              segmen={[
                { warna: 'sah', nilai: data.statusGuru.lengkap, maks: totalGuru },
                { warna: 'tunggu', nilai: data.statusGuru.perluDicek, maks: totalGuru },
                { warna: 'tolak', nilai: data.statusGuru.adaDitolak, maks: totalGuru },
                { warna: 'belum', nilai: data.statusGuru.belumMulai, maks: totalGuru },
              ]}
            />
          </Section>
          <DataTable
            keterangan="Status per dokumen" judul="Per dokumen"
            kolom={kolomPerDokumen} baris={data.perDokumen} kunciBaris={(d) => d.id}
            jumlahTeks={`${data.perDokumen.length} dokumen`}
            kosong={<EmptyState ikon={<FileText size={28} />} teks="Belum ada dokumen pada periode ini." aksi={<Tautan className="tombol-garis" href="/admin/periode">Atur dokumen periode</Tautan>} />}
          />
        </div>

        <div className="beranda__kolom">
          {data.perluPersetujuan > 0 && (
            <div className="kartu-persetujuan">
              <div>
                <h2>Perlu persetujuan</h2>
                <p>
                  <strong>{data.perluPersetujuan}</strong> guru belum disetujui dan belum bisa mengakses sistem.
                </p>
              </div>
              <Tautan className="tombol" href={`/admin/guru?status=menunggu&${pq}`}>Tinjau pendaftaran</Tautan>
            </div>
          )}
          <DataTable
            keterangan="Antrean pemeriksaan terlama" judul="Antrean pemeriksaan"
            aksiJudul={data.totalAntrean > 0 ? <Tautan href="/admin/antrean" className="tautan-kecil">Lihat semua ({data.totalAntrean})</Tautan> : undefined}
            kolom={kolomAntrean} baris={antreanTampil} kunciBaris={(i) => i.dokumenGuruId}
            jumlahTeks={`${antreanTampil.length} dari ${data.totalAntrean} dokumen, terlama di atas`}
            kosong={<EmptyState ikon={<CheckCircle2 size={28} />} teks="Tidak ada dokumen menunggu pemeriksaan." />}
          />
          <Section kartu judul="Aktivitas terbaru">
            {aktivitasTampil.length === 0 ? (
              <p className="redup teks-sm mb-0"><Activity size={14} aria-hidden="true" /> Belum ada aktivitas.</p>
            ) : (
              <ul className="aktivitas">
                {aktivitasTampil.map((a) => {
                  const guruId = a.namaGuru ? guruIdDariAntrean.get(a.namaGuru) : undefined
                  return (
                    <li key={a.id}>
                      <span className="aktivitas__waktu">{waktuWita(a.waktu)}</span>
                      <span className="aktivitas__teks">
                        {LABEL_AKSI[a.aksi] ?? a.aksi}
                        {a.namaGuru && (
                          <> — {guruId
                            ? <Tautan href={`/admin/guru/${guruId}`} prefetch={false}>{a.namaGuru}</Tautan>
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
    </div>
  )
}
