import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import BannerDrive from '@/components/BannerDrive'
import Kepala from '@/components/Kepala'

export const dynamic = 'force-dynamic'

export default async function BerandaAdmin() {
  const admin = await halamanAdmin()
  const periode = await prisma.periode.findFirst({ where: { dibuka: true } })
  const kelompok = periode
    ? await prisma.dokumenGuru.groupBy({
        by: ['guruId'],
        where: { periodeId: periode.id, status: 'MENUNGGU' },
        _count: { _all: true },
      })
    : []
  const guru = await prisma.guru.findMany({
    where: { id: { in: kelompok.map((k) => k.guruId) } },
    orderBy: { nama: 'asc' },
  })
  const jumlah = new Map(kelompok.map((k) => [k.guruId, k._count._all]))

  return (
    <>
    <Kepala sub={admin.nama} tab="beranda" />
    <main className="lebar">
      <BannerDrive />
      <h1>Beranda Admin</h1>
      <div className="panel">
        {periode ? <p>Periode dibuka: <strong>{periode.nama}</strong></p> : <p>Tidak ada periode yang sedang dibuka.</p>}
        {periode && (
          <div className="aksi">
            <a className="tombol" href={`/api/admin/rekap?periodeId=${periode.id}&format=xlsx`}>Unduh rekap XLSX</a>
            <a className="tombol" href={`/api/admin/rekap?periodeId=${periode.id}&format=csv`}>Unduh rekap CSV</a>
          </div>
        )}
      </div>
      <h2>Menunggu pemeriksaan</h2>
      {guru.length === 0 ? (
        <p className="redup">Tidak ada dokumen yang menunggu pemeriksaan.</p>
      ) : (
        <div className="geser">
          <table>
            <thead><tr><th>Nama</th><th>NIP / NIK</th><th>Menunggu</th></tr></thead>
            <tbody>
              {guru.map((g) => (
                <tr key={g.id}>
                  <td><a href={`/admin/guru/${g.id}`}><b>{g.nama}</b></a></td>
                  <td>{g.username}</td>
                  <td><span className="label MENUNGGU">{jumlah.get(g.id)} dokumen menunggu</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </>
  )
}
