import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'

export const dynamic = 'force-dynamic'

export default async function HalamanAntrean() {
  await halamanAdmin()

  const periode = await prisma.periode.findFirst({ where: { dibuka: true } })
  const kelompok = periode
    ? await prisma.dokumenGuru.findMany({
        where: { periodeId: periode.id, status: 'MENUNGGU' },
        include: { guru: { select: { id: true, nama: true, username: true } }, dokumen: { select: { nama: true } } },
        orderBy: { diunggahPada: 'asc' },
      })
    : []

  return (
    <>
      <h1>Antrean Pemeriksaan</h1>
      {!periode && (
        <p className="redup">Tidak ada periode yang sedang dibuka. <a href="/admin">Kembali ke beranda</a></p>
      )}
      {periode && kelompok.length === 0 && (
        <p className="redup">Tidak ada dokumen yang menunggu pemeriksaan di periode <strong>{periode.nama}</strong>. <a href="/admin">Kembali ke beranda</a></p>
      )}
      {periode && kelompok.length > 0 && (
        <>
          <p className="redup mb-s4">Periode: <strong>{periode.nama}</strong> — {kelompok.length} dokumen menunggu, diurutkan dari yang paling lama.</p>
          <div className="geser">
            <table>
              <thead>
                <tr>
                  <th>Guru</th>
                  <th>NIP / NIK</th>
                  <th>Dokumen</th>
                  <th>Diunggah</th>
                </tr>
              </thead>
              <tbody>
                {kelompok.map((d) => (
                  <tr key={d.id}>
                    <td><a href={`/admin/guru/${d.guruId}`}><b>{d.guru.nama}</b></a></td>
                    <td>{d.guru.username}</td>
                    <td>{d.dokumen.nama}</td>
                    <td>{d.diunggahPada ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d.diunggahPada) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
