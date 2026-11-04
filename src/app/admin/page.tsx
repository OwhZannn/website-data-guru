import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import BannerDrive from '@/components/BannerDrive'
import TombolKeluar from '@/components/TombolKeluar'

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
    <main>
      <BannerDrive />
      <div className="atas">
        <h1 style={{ margin: 0, flex: 1 }}>Beranda Admin</h1>
        <TombolKeluar />
      </div>
      <p>{admin.nama}</p>
      {periode ? <p>Periode dibuka: <strong>{periode.nama}</strong></p> : <p>Tidak ada periode yang sedang dibuka.</p>}
      <p><a href="/admin/periode">Kelola periode</a> | <a href="/admin/guru">Kelola guru</a> | <a href="/admin/admin">Kelola admin</a></p>
      {periode && <p>Unduh rekap: <a href={`/api/admin/rekap?periodeId=${periode.id}&format=csv`}>CSV</a> | <a href={`/api/admin/rekap?periodeId=${periode.id}&format=xlsx`}>XLSX</a></p>}
      <h2>Menunggu pemeriksaan</h2>
      {guru.length === 0 ? (
        <p>Tidak ada dokumen yang menunggu pemeriksaan.</p>
      ) : (
        <ul>
          {guru.map((g) => (
            <li key={g.id}>
              <a href={`/admin/guru/${g.id}`}>{g.nama}</a> — NIP {g.nip} — {jumlah.get(g.id)} dokumen menunggu
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
