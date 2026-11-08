import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru, type StatusGuru } from '@/lib/status'
import BarisGuru from '@/components/BarisGuru'
import BannerSandi from '@/components/BannerSandi'
import PilihPeriode from '@/components/PilihPeriode'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { LABEL_PEGAWAI, STATUS_PEGAWAI } from '@/lib/syarat'
import { PILIHAN_PER, potongHalaman, nomorHalaman } from '@/lib/paginasi'
import { urutkanGuru, parseUrut, type ItemUrutGuru } from '@/lib/urutGuru'
import EmptyState from '@/components/ui/EmptyState'
import { ChevronUp, ChevronDown, ChevronsUpDown, SearchX } from 'lucide-react'

export const dynamic = 'force-dynamic'

const FILTER = [
  ['semua', 'Semua'],
  ['belum-mulai', 'Belum mulai'],
  ['perlu-dicek', 'Perlu dicek'],
  ['ada-ditolak', 'Ada yang ditolak'],
  ['lengkap', 'Lengkap'],
  ['menunggu', 'Belum disetujui'],
] as const
const LABEL: Record<string, StatusGuru['label']> = {
  'belum-mulai': 'Belum mulai',
  'perlu-dicek': 'Perlu dicek',
  'ada-ditolak': 'Ada yang ditolak',
  lengkap: 'Lengkap',
}

export default async function HalamanGuru({ searchParams }: {
  searchParams: Promise<{ q?: string; status?: string; periode?: string; hal?: string; per?: string; urut?: string; arah?: string; asalSekolah?: string; statusPegawai?: string }>
}) {
  await halamanAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const filter = sp.status && (LABEL[sp.status] || sp.status === 'menunggu') ? sp.status : 'semua'
  const filterSekolah = sp.asalSekolah ?? ''
  const filterPegawai = sp.statusPegawai ?? ''
  const { kolom: urutKolom, arah: urutArah } = parseUrut(sp.urut, sp.arah)

  // Bawaan sama dengan /dokumen dan Detail Guru: periode dibuka, kalau tidak ada yang terbaru.
  const daftarPeriode = await semuaPeriode()
  const periode = pilihPeriode(daftarPeriode, sp.periode)
  const semuaGuru = await prisma.guru.findMany({ orderBy: [{ nama: 'asc' }, { id: 'asc' }] })
  const cocok = (t: string | null) => !!t && t.toLowerCase().includes(q.toLowerCase())
  const semua = q ? semuaGuru.filter((g) => cocok(g.nama) || cocok(g.username) || cocok(g.nip) || cocok(g.nik) || cocok(g.asalSekolah)) : semuaGuru
  const menunggu = semuaGuru.filter((g) => !g.disetujui).length

  // Status dihitung massal: dua query, lalu dikelompokkan di memori.
  const status = new Map<string, StatusGuru>()
  // Aktivitas terakhir per guru (satu groupBy, tidak N+1).
  const aktivitasMap = new Map<string, number>()
  if (periode) {
    const [aktif, baris, grupAktivitas] = await Promise.all([
      prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true } }),
      prisma.dokumenGuru.findMany({ where: { periodeId: periode.id } }),
      prisma.riwayat.groupBy({
        by: ['guruId'],
      where: { periodeId: periode.id, guruId: { not: null } },
      _max: { waktu: true },
      }),
    ])
    const per = new Map<string, typeof baris>()
    for (const b of baris) { const l = per.get(b.guruId); if (l) l.push(b); else per.set(b.guruId, [b]) }
    for (const g of semuaGuru) if (g.aktif && g.disetujui) status.set(g.id, hitungStatusGuru(aktif, per.get(g.id) ?? [], g))
    for (const a of grupAktivitas) {
    const t = a._max?.waktu
    const gid = a.guruId
    if (t && gid) aktivitasMap.set(gid, new Date(t).getTime())
    }
  }
  const totalAktif = status.size
  const hitung = (l: string) => [...status.values()].filter((s) => s.label === l).length
  const hitungMenunggu = menunggu

  // Filter gabungan
  let tersaring = filter === 'menunggu' ? semua.filter((g) => !g.disetujui)
    : periode && filter !== 'semua' ? semua.filter((g) => status.get(g.id)?.label === LABEL[filter]) : semua
  if (filterSekolah) tersaring = tersaring.filter((g) => g.asalSekolah === filterSekolah)
  if (filterPegawai) tersaring = tersaring.filter((g) => g.statusPegawai === filterPegawai)

  // Daftar sekolah distinct untuk filter
  const daftarSekolah = [...new Set(semuaGuru.map((g) => g.asalSekolah).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'id'))

  // Urut (sebelum paginasi)
  const itemUrut: (typeof tersaring[0] & ItemUrutGuru)[] = tersaring.map((g) => {
    const s = status.get(g.id)
    return Object.assign(g, {
      jumlahSah: s?.jumlahSah ?? 0,
      jumlahWajib: s?.jumlahWajib ?? 0,
      aktivitasTerakhir: aktivitasMap.get(g.id) ?? null,
    })
  })
  const terurut = urutkanGuru(itemUrut, urutKolom, urutArah)

  const halaman = potongHalaman(terurut, sp.hal, sp.per)
  const guru = halaman.isi

  // Tautan ke halaman lain mempertahankan semua parameter.
  const adaFilter = filter !== 'semua' || q || filterSekolah || filterPegawai
  const tautan = (ubah: Record<string, string | number>) => {
    const q2 = new URLSearchParams({
      ...(periode ? { periode: periode.id } : {}),
      ...(q ? { q } : {}),
      ...(filter !== 'semua' ? { status: filter } : {}),
      ...(filterSekolah ? { asalSekolah: filterSekolah } : {}),
      ...(filterPegawai ? { statusPegawai: filterPegawai } : {}),
      ...(urutKolom !== 'nama' || urutArah !== 'asc' ? { urut: urutKolom, arah: urutArah } : {}),
      per: String(halaman.per), hal: String(halaman.hal),
    })
    for (const [k, v] of Object.entries(ubah)) q2.set(k, String(v))
    return `?${q2}`
  }

  // Tajuk kolom yang bisa diurut
  function TajukUrut({ kolom, label }: { kolom: typeof urutKolom; label: string }) {
    const aktif = urutKolom === kolom
    const arahBaru = aktif && urutArah === 'asc' ? 'desc' : 'asc'
    const href = tautan({ urut: kolom, arah: arahBaru, hal: 1 })
    const sortAttr = aktif ? (urutArah === 'asc' ? 'ascending' : 'descending') : 'none'
    return (
      <th aria-sort={sortAttr}>
        <a href={href} className="tajuk-urut">
          {label}
          {aktif && urutArah === 'asc' ? <ChevronUp size={14} /> : aktif && urutArah === 'desc' ? <ChevronDown size={14} /> : <ChevronsUpDown size={14} />}
        </a>
      </th>
    )
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
          {menunggu} pendaftaran guru belum disetujui.{' '}
          <a href={tautan({ status: 'menunggu', hal: 1 })}>Tampilkan</a>
        </p>
      )}

      {/* Filter gabungan */}
      <form method="get" className="filter-gabungan" aria-label="Filter guru">
        {periode && <input type="hidden" name="periode" value={periode.id} />}
        {(urutKolom !== 'nama' || urutArah !== 'asc') && (
          <>
            <input type="hidden" name="urut" value={urutKolom} />
            <input type="hidden" name="arah" value={urutArah} />
          </>
        )}
        <input type="hidden" name="per" value={halaman.per} />

        {/* Chip status */}
        <div className="filter-gabungan__chip" role="group" aria-label="Filter status">
          {FILTER.map(([v, l]) => {
            const jumlah = v === 'semua' ? semua.length : v === 'menunggu' ? hitungMenunggu : hitung(LABEL[v] ?? '')
            return (
              <label key={v} className={`chip-filter${filter === v ? ' chip-filter--aktif' : ''}`}>
                <input type="radio" name="status" value={v} defaultChecked={filter === v} className="sr-only" />
                {l}{jumlah > 0 && v !== 'semua' ? <span className="chip-filter__angka">{jumlah}</span> : null}
              </label>
            )
          })}
        </div>

        {/* Baris cari + sekolah + pegawai */}
        <div className="filter-gabungan__baris">
          <input name="q" type="search" aria-label="Cari nama atau NIP" placeholder="Cari nama, NIP…" defaultValue={q} className="filter-gabungan__cari" />
          <select name="asalSekolah" aria-label="Asal sekolah" defaultValue={filterSekolah} className="filter-gabungan__pilih">
            <option value="">Semua sekolah</option>
            {daftarSekolah.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="statusPegawai" aria-label="Jenis pegawai" defaultValue={filterPegawai} className="filter-gabungan__pilih">
            <option value="">Semua jenis pegawai</option>
            {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="submit" className="tombol-sm">Terapkan filter</button>
          {adaFilter && (
            <a href={periode ? `?periode=${periode.id}` : '?'} className="hapus-filter">Hapus filter</a>
          )}
        </div>
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
        <table className="tabel-guru">
          <thead>
            <tr>
              <TajukUrut kolom="nama" label="Nama" />
              <th>NIP / NIK</th>
              {periode && (
                <>
                  <TajukUrut kolom="progres" label="Progres" />
                  <th>Status dokumen</th>
                  <TajukUrut kolom="aktivitas" label="Aktivitas" />
                </>
              )}
              <th>Akun</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {guru.map((g) => {
              const s = status.get(g.id)
              const aktivitas = aktivitasMap.get(g.id)
              return (
                <BarisGuru
                  key={g.id}
                  guru={{
                    id: g.id, nama: g.nama, username: g.username, aktif: g.aktif, disetujui: g.disetujui,
                    keterangan: [g.asalSekolah, LABEL_PEGAWAI[g.statusPegawai ?? '']].filter(Boolean).join(' · ') || undefined,
                  }}
                  status={s ? { jumlahSah: s.jumlahSah, jumlahWajib: s.jumlahWajib, label: s.label } : periode ? { jumlahSah: 0, jumlahWajib: 0, label: '-' as StatusGuru['label'] } : undefined}
                  aktivitas={aktivitas}
                  adaPeriode={!!periode}
                />
              )
            })}
          </tbody>
        </table>
      </div>
      {halaman.total === 0 && (
        <EmptyState ikon={<SearchX size={32} />} teks="Tidak ada guru yang cocok." aksi={
          adaFilter ? <a href={periode ? `?periode=${periode.id}` : '?'} className="hapus-filter">Hapus filter</a> : undefined
        } />
      )}
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
