import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import BannerDrive from '@/components/BannerDrive'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru } from '@/lib/status'
import { daftarRiwayatDokumen, namaPelakuRiwayat } from '@/lib/riwayat'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import PilihPeriode from '@/components/PilihPeriode'
import { ZONA_WAKTU } from '@/lib/waktu'
import Kepala from '@/components/Kepala'
import KartuProgres from '@/components/KartuProgres'
import TombolKeputusan from '@/components/TombolKeputusan'
import FormProfil from '@/components/FormProfil'
import { teksIdentitas } from '@/lib/identitas'
import { dokumenWajib, profilLengkap, LABEL_JABATAN, LABEL_PEGAWAI, TUGAS } from '@/lib/syarat'
import PilihTugas from '@/components/PilihTugas'

export const dynamic = 'force-dynamic'

const LABEL: Record<string, string> = { BELUM: 'Belum diunggah', MENUNGGU: 'Menunggu diperiksa', SAH: 'SAH', DITOLAK: 'Ditolak' }
const AKSI: Record<string, string> = {
  unggah: 'Diunggah', ganti_file: 'File diganti', sahkan: 'Disahkan', tolak: 'Ditolak', batalkan: 'Keputusan dibatalkan',
}
const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'medium', timeStyle: 'short' }).format(d) + ' WITA'

export default async function DetailGuru({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  const admin = await halamanAdmin()
  const { id } = await params
  const sp = await searchParams
  const guru = await prisma.guru.findUnique({ where: { id } })
  if (!guru) notFound()

  // Admin melihat semua periode; keputusan tetap boleh walau periode ditutup.
  const daftarPeriode = await semuaPeriode()
  const periode = pilihPeriode(daftarPeriode, sp.periode)
  // Sama dengan halaman guru: hanya dokumen yang wajib menurut profil yang ditampilkan dan dihitung.
  const dokumen = periode
    ? dokumenWajib(await prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true }, orderBy: { urutan: 'asc' } }), guru)
    : []
  const baris = periode ? await prisma.dokumenGuru.findMany({ where: { periodeId: periode.id, guruId: guru.id } }) : []
  const status = hitungStatusGuru(dokumen, baris, guru)
  const tugas = TUGAS.filter(([k]) => guru[k]).map(([, l]) => l)
  const riwayatProfil = await prisma.riwayat.findMany({
    where: { guruId: guru.id, aksi: 'ubah_profil' }, orderBy: [{ waktu: 'desc' }, { id: 'desc' }], take: 5,
  })
  const riwayat = await Promise.all(dokumen.map((d) => daftarRiwayatDokumen(guru.id, d.id)))
  const pelaku = await namaPelakuRiwayat(riwayat.flat())

  return (
    <>
    <Kepala sub={admin.nama} tab="guru" />
    <main className="dua">
      <div className="dua-kiri">
      <BannerDrive />
      <p style={{ margin: '4px 0 0' }}><a href="/admin/guru">← Daftar guru</a></p>
      <h1>Detail Guru</h1>
      <p style={{ margin: '0 0 12px' }}><strong>{guru.nama}</strong><br /><span className="redup">{teksIdentitas(guru)}</span></p>
      <section className="panel" aria-label="Profil guru">
        {!profilLengkap(guru) && <p className="info" style={{ margin: '0 0 10px' }}>Profil belum lengkap. Guru ini belum bisa mengunggah.</p>}
        <dl className="profil-ringkas">
          <dt>Sekolah</dt><dd>{guru.asalSekolah ?? '-'}</dd>
          <dt>Jabatan</dt><dd>{LABEL_JABATAN[guru.jabatan] ?? guru.jabatan}</dd>
          <dt>Status</dt><dd>{LABEL_PEGAWAI[guru.statusPegawai ?? ''] ?? '-'}</dd>
          <dt>Sertifikasi</dt><dd>{guru.tahunSertifikasi ?? '-'}{guru.sertifikasiBaru ? ' · sertifikasi baru' : ''}</dd>
          <dt>Tugas</dt><dd>{tugas.length ? tugas.join(', ') : 'Tidak ada'}</dd>
        </dl>
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontWeight: 700, color: 'var(--hijau-2)' }}>Koreksi profil dan tugas</summary>
          <div style={{ marginTop: 10 }}>
            <FormProfil awal={guru} guruId={guru.id} />
            <PilihTugas awal={Object.fromEntries(TUGAS.map(([k]) => [k, guru[k]])) as Record<(typeof TUGAS)[number][0], boolean>} guruId={guru.id} />
          </div>
        </details>
        {riwayatProfil.length > 0 && (
          <ul className="riwayat" aria-label="Riwayat profil">
            {riwayatProfil.map((r) => <li key={r.id}>{waktuWita(r.waktu)} — {r.olehTipe === 'admin' ? 'admin' : 'guru'}: {r.alasan}</li>)}
          </ul>
        )}
      </section>
      {periode && <PilihPeriode daftar={daftarPeriode} dipilih={periode.id} />}
      {periode && <p className="redup" style={{ margin: '0 0 8px' }}>{periode.nama}{periode.dibuka ? '' : ' (ditutup)'}</p>}
      <KartuProgres sah={status.jumlahSah} wajib={status.jumlahWajib} />
      </div>
      <div className="dua-kanan">
      {dokumen.map((d, i) => {
        const b = baris.find((x) => x.dokumenId === d.id)
        const st = b?.status ?? 'BELUM'
        return (
          <section className={st === 'DITOLAK' ? 'kartu ditolak' : 'kartu'} key={d.id} aria-label={d.nama}>
            <div className="kartu-atas">
              <div><h2>{d.nama}</h2></div>
              <span className={`label ${st}`}>{LABEL[st] ?? st}</span>
            </div>
            {b?.fileId && (
              <p>
                <a href={`https://drive.google.com/file/d/${b.fileId}/view`} target="_blank" rel="noopener noreferrer">Buka file</a>
                {b.namaFile && <> ({b.namaFile})</>}
              </p>
            )}
            {b?.alasan && <div className="alasan">Alasan: {b.alasan}</div>}
            {b?.fileId && <TombolKeputusan dokumenGuruId={b.id} status={st} />}
            {riwayat[i].length > 0 && (
              <ul className="riwayat">
                {riwayat[i].map((r) => (
                  <li key={r.id}>
                    {waktuWita(r.waktu)} — {AKSI[r.aksi] ?? r.aksi} oleh {pelaku.get(r.id)}{r.olehTipe === 'admin' ? ' (admin)' : ''}
                    {r.alasan && <>: {r.alasan}</>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      </div>
    </main>
    </>
  )
}
