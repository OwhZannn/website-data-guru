import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import TombolKeluar from '@/components/TombolKeluar'
import ImporGuru from '@/components/ImporGuru'
import BarisGuru from '@/components/BarisGuru'

export const dynamic = 'force-dynamic'

export default async function HalamanGuru({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await halamanAdmin()
  const q = ((await searchParams).q ?? '').trim()
  const guru = await prisma.guru.findMany({
    where: q ? { OR: [{ nama: { contains: q } }, { nip: { contains: q } }] } : {},
    orderBy: { nama: 'asc' },
  })
  return (
    <main>
      <div className="atas">
        <h1 style={{ margin: 0, flex: 1 }}>Guru</h1>
        <TombolKeluar />
      </div>
      <p><a href="/admin">Beranda</a></p>
      <ImporGuru />
      <h2>Daftar guru ({guru.length})</h2>
      <form method="get">
        <input name="q" aria-label="Cari nama atau NIP" defaultValue={q} /> <button type="submit">Cari</button>
      </form>
      <table>
        <thead><tr><th>Nama</th><th>NIP</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>{guru.map((g) => <BarisGuru key={g.id} guru={{ id: g.id, nama: g.nama, nip: g.nip, email: g.email, aktif: g.aktif }} />)}</tbody>
      </table>
    </main>
  )
}
