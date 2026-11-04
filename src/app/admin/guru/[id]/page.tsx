import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru } from '@/lib/status'
import { daftarRiwayatDokumen } from '@/lib/riwayat'
import { ZONA_WAKTU } from '@/lib/waktu'
import TombolKeluar from '@/components/TombolKeluar'
import TombolKeputusan from '@/components/TombolKeputusan'

export const dynamic = 'force-dynamic'

const LABEL: Record<string, string> = { BELUM: 'Belum diunggah', MENUNGGU: 'Menunggu diperiksa', SAH: 'SAH', DITOLAK: 'Ditolak' }
const AKSI: Record<string, string> = {
  unggah: 'Diunggah', ganti_file: 'File diganti', sahkan: 'Disahkan', tolak: 'Ditolak', batalkan: 'Keputusan dibatalkan',
}
const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'medium', timeStyle: 'short' }).format(d) + ' WITA'

export default async function DetailGuru({ params }: { params: Promise<{ id: string }> }) {
  await halamanAdmin()
  const { id } = await params
  const guru = await prisma.guru.findUnique({ where: { id } })
  if (!guru) notFound()

  const dibuka = await prisma.periode.findFirst({ where: { dibuka: true } })
  const periode = dibuka ?? (await prisma.periode.findFirst({ orderBy: { dibuatPada: 'desc' } }))
  const dokumen = periode
    ? await prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true }, orderBy: { urutan: 'asc' } })
    : []
  const baris = periode ? await prisma.dokumenGuru.findMany({ where: { periodeId: periode.id, guruId: guru.id } }) : []
  const status = hitungStatusGuru(dokumen, baris)
  const riwayat = await Promise.all(dokumen.map((d) => daftarRiwayatDokumen(guru.id, d.id)))

  return (
    <main>
      <div className="atas">
        <a href="/admin" style={{ flex: 1 }}>← Beranda admin</a>
        <TombolKeluar />
      </div>
      <h1>Detail Guru</h1>
      <p><strong>{guru.nama}</strong><br />NIP {guru.nip}</p>
      {periode && <p>{periode.nama}</p>}
      <p><strong>Progres: {status.jumlahSah} dari {status.jumlahWajib} dokumen sah</strong></p>
      {dokumen.map((d, i) => {
        const b = baris.find((x) => x.dokumenId === d.id)
        const st = b?.status ?? 'BELUM'
        return (
          <section className="kartu" key={d.id} aria-label={d.nama}>
            <h2>{d.nama}</h2>
            <span className={`label ${st}`}>{LABEL[st] ?? st}</span>
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
                    {waktuWita(r.waktu)} — {AKSI[r.aksi] ?? r.aksi} oleh {r.olehTipe === 'admin' ? 'admin' : 'guru'}
                    {r.alasan && <>: {r.alasan}</>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </main>
  )
}
