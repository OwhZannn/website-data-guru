import { FileText } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import BannerDrive from '@/components/BannerDrive'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru } from '@/lib/status'
import { daftarRiwayatDokumen, namaPelakuRiwayat } from '@/lib/riwayat'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import PilihPeriode from '@/components/PilihPeriode'
import Breadcrumb from '@/components/ui/Breadcrumb'
import KartuProgres from '@/components/KartuProgres'
import FormProfil from '@/components/FormProfil'
import { teksIdentitas } from '@/lib/identitas'
import { dokumenWajib, profilLengkap, LABEL_JABATAN, LABEL_PEGAWAI, TUGAS } from '@/lib/syarat'
import PilihTugas from '@/components/PilihTugas'
import { daftarAlasanAktif } from '@/lib/alasanTolak'
import ReviewPanel from '@/components/ReviewPanel'
import SahkanMassal from '@/components/SahkanMassal'
import TimelineRiwayat from '@/components/TimelineRiwayat'
import { ZONA_WAKTU } from '@/lib/waktu'

export const dynamic = 'force-dynamic'

const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'medium', timeStyle: 'short' }).format(d) + ' WITA'

export default async function DetailGuru({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periode?: string; dok?: string }>
}) {
  await halamanAdmin()
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
  const alasanPreset = await daftarAlasanAktif()

  // Data untuk ReviewPanel
  const dokReview = dokumen.map((d) => {
    const b = baris.find((x) => x.dokumenId === d.id)
    return {
      id: d.id,
      // Gunakan id dokumen sebagai pengganti bila belum ada baris DokumenGuru.
      dokumenGuruId: b?.id ?? `belum-${d.id}`,
      nama: d.nama,
      status: b?.status ?? 'BELUM',
      fileId: b?.fileId ?? null,
      alasan: b?.alasan ?? null,
    }
  })

  // Dokumen MENUNGGU dengan file untuk sahkan massal
  const menungguDenganFile = dokReview.filter((d) => d.status === 'MENUNGGU' && d.fileId)

  // Guru berikutnya dengan dokumen MENUNGGU di periode yang sama
  let guruBerikutnya: { id: string; nama: string } | null = null
  if (periode) {
    const kandidat = await prisma.dokumenGuru.findFirst({
      where: {
        periodeId: periode.id,
        status: 'MENUNGGU',
        fileId: { not: null },
        guruId: { not: guru.id },
      },
      orderBy: { diunggahPada: 'asc' },
      select: { guruId: true },
    })
    if (kandidat) {
      const g = await prisma.guru.findUnique({ where: { id: kandidat.guruId }, select: { id: true, nama: true } })
      guruBerikutnya = g
    }
  }

  return (
    <>
    <Breadcrumb butir={[
      { label: 'Beranda', href: '/admin' },
      { label: 'Guru', href: '/admin/guru' },
      { label: guru.nama },
    ]} />
    <div className="dua">
      <div className="dua-kiri">
      <BannerDrive />
      <h1>Detail Guru</h1>
      <p className="mb-s3"><strong>{guru.nama}</strong><br /><span className="redup">{teksIdentitas(guru)}</span></p>
      <section className="panel" aria-label="Profil guru">
        {!profilLengkap(guru) && <p className="info mb-s3">Profil belum lengkap. Guru ini belum bisa mengunggah.</p>}
        <dl className="profil-ringkas">
          <dt>Sekolah</dt><dd>{guru.asalSekolah ?? '-'}</dd>
          <dt>Jabatan</dt><dd>{LABEL_JABATAN[guru.jabatan] ?? guru.jabatan}</dd>
          <dt>Status</dt><dd>{LABEL_PEGAWAI[guru.statusPegawai ?? ''] ?? '-'}</dd>
          <dt>Sertifikasi</dt><dd>{guru.tahunSertifikasi ?? '-'}{guru.sertifikasiBaru ? ' · sertifikasi baru' : ''}</dd>
          <dt>Tugas</dt><dd>{tugas.length ? tugas.join(', ') : 'Tidak ada'}</dd>
        </dl>
        <details className="mt-s3">
          <summary className="ringkas-detail-summary">Koreksi profil dan tugas</summary>
          <div className="mt-s3">
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
      {periode && <p className="redup mb-s2">{periode.nama}{periode.dibuka ? '' : ' (ditutup)'}</p>}
      <KartuProgres sah={status.jumlahSah} wajib={status.jumlahWajib} />
      {periode && menungguDenganFile.length > 0 && (
        <SahkanMassal
          guruId={guru.id}
          periodeId={periode.id}
          dokumen={menungguDenganFile.map((d) => ({ id: d.dokumenGuruId, nama: d.nama, fileId: d.fileId! }))}
        />
      )}
      </div>
      <div className="dua-kanan">
      {/* Mode review: split pane dengan pratinjau + keputusan */}
      {periode && dokReview.length > 0 ? (
        <>
          <ReviewPanel
            guruId={guru.id}
            periodeId={periode.id}
            dokumen={dokReview}
            dokTerpilihId={sp.dok ?? null}
            alasanPreset={alasanPreset}
            guruBerikutnyaId={guruBerikutnya?.id ?? null}
            guruBerikutnyaNama={guruBerikutnya?.nama ?? null}
          />
          {/* Timeline riwayat per dokumen */}
          {dokumen.map((d, i) => {
            const b = baris.find((x) => x.dokumenId === d.id)
            if (!b || riwayat[i].length === 0) return null
            return (
              <section key={d.id} className="mt-s5">
                <h3 className="mb-s3">Riwayat — {d.nama}</h3>
                <TimelineRiwayat riwayat={riwayat[i]} namaPelaku={pelaku} />
              </section>
            )
          })}
        </>
      ) : (
        <EmptyState ikon={<FileText size={28} />} teks={periode ? 'Tidak ada dokumen wajib untuk periode ini.' : 'Pilih periode untuk melihat dokumen.'} />
      )}
      </div>
    </div>
    </>
  )
}
