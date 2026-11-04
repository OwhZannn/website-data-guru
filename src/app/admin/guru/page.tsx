import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru, type StatusGuru } from '@/lib/status'
import TombolKeluar from '@/components/TombolKeluar'
import ImporGuru from '@/components/ImporGuru'
import BarisGuru from '@/components/BarisGuru'
import PilihPeriode from '@/components/PilihPeriode'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'

export const dynamic = 'force-dynamic'

const FILTER = [
  ['semua', 'Semua'],
  ['belum-mulai', 'Belum mulai'],
  ['perlu-dicek', 'Perlu dicek'],
  ['ada-ditolak', 'Ada yang ditolak'],
  ['lengkap', 'Lengkap'],
] as const
const LABEL: Record<string, StatusGuru['label']> = {
  'belum-mulai': 'Belum mulai',
  'perlu-dicek': 'Perlu dicek',
  'ada-ditolak': 'Ada yang ditolak',
  lengkap: 'Lengkap',
}

export default async function HalamanGuru({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; periode?: string }> }) {
  await halamanAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const filter = sp.status && LABEL[sp.status] ? sp.status : 'semua'
  // Bawaan sama dengan /dokumen dan Detail Guru: periode dibuka, kalau tidak ada yang terbaru.
  const daftarPeriode = await semuaPeriode()
  const periode = pilihPeriode(daftarPeriode, sp.periode)
  const semuaGuru = await prisma.guru.findMany({ orderBy: [{ nama: 'asc' }, { id: 'asc' }] })
  const semua = q ? semuaGuru.filter((g) => g.nama.toLowerCase().includes(q.toLowerCase()) || g.nip.toLowerCase().includes(q.toLowerCase())) : semuaGuru

  // Status dihitung massal: dua query, lalu dikelompokkan di memori.
  const status = new Map<string, StatusGuru>()
  if (periode) {
    const [aktif, baris] = await Promise.all([
      prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true } }),
      prisma.dokumenGuru.findMany({ where: { periodeId: periode.id } }),
    ])
    const per = new Map<string, typeof baris>()
    for (const b of baris) { const l = per.get(b.guruId); if (l) l.push(b); else per.set(b.guruId, [b]) }
    for (const g of semuaGuru) if (g.aktif) status.set(g.id, hitungStatusGuru(aktif, per.get(g.id) ?? []))
  }
  const totalAktif = status.size
  const lengkap = [...status.values()].filter((s) => s.lengkap).length
  const guru = periode && filter !== 'semua' ? semua.filter((g) => status.get(g.id)?.label === LABEL[filter]) : semua

  return (
    <main>
      <div className="atas">
        <h1 style={{ margin: 0, flex: 1 }}>Guru</h1>
        <TombolKeluar />
      </div>
      <p><a href="/admin">Beranda</a></p>
      <ImporGuru />
      <h2>Daftar guru ({guru.length})</h2>
      {periode && <PilihPeriode daftar={daftarPeriode} dipilih={periode.id} lain={{ q, status: filter }} />}
      {periode && <h3>Status dokumen periode {periode.nama}{periode.dibuka ? ' (dibuka)' : ' (ditutup)'}</h3>}
      {periode ? (
        <p data-testid="ringkasan">Total: {totalAktif} | Lengkap: {lengkap} | Belum lengkap: {totalAktif - lengkap}</p>
      ) : (
        <p>Belum ada periode, sehingga status dokumen tidak ditampilkan.</p>
      )}
      <form method="get">
        {periode && <input type="hidden" name="periode" value={periode.id} />}
        <input name="q" aria-label="Cari nama atau NIP" defaultValue={q} />{' '}
        {periode && (
          <select name="status" aria-label="Filter status" defaultValue={filter}>
            {FILTER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}{' '}
        <button type="submit">Cari</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Nama</th><th>NIP</th><th>Email</th>
            {periode && <><th>Progres</th><th>Status dokumen</th></>}
            <th>Akun</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {guru.map((g) => {
            const s = status.get(g.id)
            return (
              <BarisGuru
                key={g.id}
                guru={{ id: g.id, nama: g.nama, nip: g.nip, email: g.email, aktif: g.aktif }}
                status={s ? { progres: `${s.jumlahSah}/${s.jumlahWajib}`, label: s.label } : periode ? { progres: '-', label: '-' } : undefined}
              />
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
