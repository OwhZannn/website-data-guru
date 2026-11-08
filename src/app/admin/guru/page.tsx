import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru, type StatusGuru } from '@/lib/status'
import BarisGuru from '@/components/BarisGuru'
import BannerSandi from '@/components/BannerSandi'
import PilihPeriode from '@/components/PilihPeriode'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { LABEL_PEGAWAI } from '@/lib/syarat'
import { PILIHAN_PER, potongHalaman, nomorHalaman } from '@/lib/paginasi'

export const dynamic = 'force-dynamic'

const FILTER = [
  ['semua', 'Semua'],
  ['belum-mulai', 'Belum mulai'],
  ['perlu-dicek', 'Perlu dicek'],
  ['ada-ditolak', 'Ada yang ditolak'],
  ['lengkap', 'Lengkap'],
  ['menunggu', 'Menunggu persetujuan'],
] as const
const LABEL: Record<string, StatusGuru['label']> = {
  'belum-mulai': 'Belum mulai',
  'perlu-dicek': 'Perlu dicek',
  'ada-ditolak': 'Ada yang ditolak',
  lengkap: 'Lengkap',
}

export default async function HalamanGuru({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; periode?: string; hal?: string; per?: string }> }) {
  await halamanAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const filter = sp.status && (LABEL[sp.status] || sp.status === 'menunggu') ? sp.status : 'semua'
  // Bawaan sama dengan /dokumen dan Detail Guru: periode dibuka, kalau tidak ada yang terbaru.
  const daftarPeriode = await semuaPeriode()
  const periode = pilihPeriode(daftarPeriode, sp.periode)
  const semuaGuru = await prisma.guru.findMany({ orderBy: [{ nama: 'asc' }, { id: 'asc' }] })
  const cocok = (t: string | null) => !!t && t.toLowerCase().includes(q.toLowerCase())
  const semua = q ? semuaGuru.filter((g) => cocok(g.nama) || cocok(g.username) || cocok(g.nip) || cocok(g.nik) || cocok(g.asalSekolah)) : semuaGuru
  // Pendaftaran yang belum disetujui tampil paling atas supaya tidak terlewat.
  semua.sort((a, b) => Number(a.disetujui) - Number(b.disetujui))
  const menunggu = semuaGuru.filter((g) => !g.disetujui).length

  // Status dihitung massal: dua query, lalu dikelompokkan di memori.
  const status = new Map<string, StatusGuru>()
  if (periode) {
    const [aktif, baris] = await Promise.all([
      prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true } }),
      prisma.dokumenGuru.findMany({ where: { periodeId: periode.id } }),
    ])
    const per = new Map<string, typeof baris>()
    for (const b of baris) { const l = per.get(b.guruId); if (l) l.push(b); else per.set(b.guruId, [b]) }
    for (const g of semuaGuru) if (g.aktif && g.disetujui) status.set(g.id, hitungStatusGuru(aktif, per.get(g.id) ?? [], g))
  }
  const totalAktif = status.size
  const hitung = (l: string) => [...status.values()].filter((s) => s.label === l).length
  const tersaring = filter === 'menunggu' ? semua.filter((g) => !g.disetujui)
    : periode && filter !== 'semua' ? semua.filter((g) => status.get(g.id)?.label === LABEL[filter]) : semua
  const halaman = potongHalaman(tersaring, sp.hal, sp.per)
  const guru = halaman.isi
  // Tautan ke halaman lain mempertahankan pencarian, saringan, periode, dan jumlah per halaman.
  const tautan = (ubah: Record<string, string | number>) => {
    const q2 = new URLSearchParams({
      ...(periode ? { periode: periode.id } : {}), ...(q ? { q } : {}), ...(filter !== 'semua' ? { status: filter } : {}),
      per: String(halaman.per), hal: String(halaman.hal),
    })
    for (const [k, v] of Object.entries(ubah)) q2.set(k, String(v))
    return `?${q2}`
  }

  return (
    <>
      <div className="judul-aksi">
        <h1>Guru</h1>
        <span className="aksi mt-0">
          <a className="tombol" href="/admin/guru/tambah">Tambah guru</a>
          <a className="tombol-garis" href="/admin/guru/impor">Impor guru</a>
        </span>
      </div>
      {periode && <PilihPeriode daftar={daftarPeriode} dipilih={periode.id} lain={{ q, status: filter }} />}
      {periode && <p className="redup mb-s1">Status dokumen periode {periode.nama}{periode.dibuka ? ' (dibuka)' : ' (ditutup)'} · {totalAktif} guru aktif</p>}
      <BannerSandi />
      {menunggu > 0 && (
        <p className="info" role="status">
          {menunggu} pendaftaran guru menunggu persetujuan.{' '}
          <a href={tautan({ status: 'menunggu', hal: 1 })}>Tampilkan</a>
        </p>
      )}
      {periode ? (
        <nav className="ringkas" data-testid="ringkasan" aria-label="Ringkasan status">
          {FILTER.filter(([v]) => v !== 'semua' && v !== 'menunggu').reverse().map(([v, l]) => (
            <a
              key={v}
              className={l.replace(/ /g, '-')}
              href={tautan({ status: filter === v ? 'semua' : v, hal: 1 })}
              aria-current={filter === v ? 'true' : undefined}
            >
              <b>{hitung(l)}</b><span>{l}</span>
            </a>
          ))}
        </nav>
      ) : (
        <p>Belum ada periode, sehingga status dokumen tidak ditampilkan.</p>
      )}
      <form method="get" className="cari">
        {periode && <input type="hidden" name="periode" value={periode.id} />}
        <input type="hidden" name="per" value={halaman.per} />
        <input name="q" aria-label="Cari nama atau NIP" placeholder="Cari nama, NIP, atau sekolah" defaultValue={q} />
        {periode && (
          <select name="status" aria-label="Filter status" defaultValue={filter}>
            {FILTER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        <button type="submit">Cari</button>
      </form>
      <div className="judul-aksi">
        <h2>Daftar guru ({halaman.total})</h2>
        <nav className="per-halaman" aria-label="Jumlah per halaman">
          <span className="redup">Tampilkan</span>
          {PILIHAN_PER.map((n) => (
            <a key={n} href={tautan({ per: n, hal: 1 })} aria-current={halaman.per === n ? 'page' : undefined}>{n}</a>
          ))}
        </nav>
      </div>
      <div className="geser">
      <table>
        <thead>
          <tr>
            <th>Nama</th><th>NIP / NIK</th>
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
                guru={{
                  id: g.id, nama: g.nama, username: g.username, aktif: g.aktif, disetujui: g.disetujui,
                  keterangan: [g.asalSekolah, LABEL_PEGAWAI[g.statusPegawai ?? '']].filter(Boolean).join(' · ') || 'Profil belum diisi',
                }}
                status={s ? { progres: `${s.jumlahSah}/${s.jumlahWajib}`, label: s.label } : periode ? { progres: '-', label: '-' } : undefined}
              />
            )
          })}
        </tbody>
      </table>
      </div>
      {halaman.total === 0 && <p className="redup">Tidak ada guru yang cocok.</p>}
      <nav className="paginasi" aria-label="Halaman daftar guru">
        <span className="redup">Menampilkan {halaman.dari}–{halaman.sampai} dari {halaman.total} guru</span>
        {halaman.jumlahHal > 1 && (
          <span className="paginasi-nomor">
            {halaman.hal > 1 ? <a href={tautan({ hal: halaman.hal - 1 })} rel="prev">‹ Sebelumnya</a> : <span className="mati">‹ Sebelumnya</span>}
            {nomorHalaman(halaman.hal, halaman.jumlahHal).map((n, i) =>
              n === null
                ? <span key={`celah-${i}`} className="celah">…</span>
                : <a key={n} href={tautan({ hal: n })} aria-current={n === halaman.hal ? 'page' : undefined}>{n}</a>,
            )}
            {halaman.hal < halaman.jumlahHal ? <a href={tautan({ hal: halaman.hal + 1 })} rel="next">Berikutnya ›</a> : <span className="mati">Berikutnya ›</span>}
          </span>
        )}
      </nav>
    </>
  )
}
