import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { hitungStatusGuru, type StatusGuru } from '@/lib/status'
import AksiGuru from '@/components/AksiGuru'
import ProgressBar from '@/components/ui/ProgressBar'
import DataTable, { type Kolom } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import FormOtomatis from '@/components/FormOtomatis'
import { bangunTautan, arahBerikut } from '@/lib/dataTable'
import { formatAktivitas } from '@/lib/aktivitas'
import BannerSandi from '@/components/BannerSandi'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { LABEL_PEGAWAI, STATUS_PEGAWAI } from '@/lib/syarat'
import { potongHalaman } from '@/lib/paginasi'
import { urutkanGuru, parseUrut, type ItemUrutGuru } from '@/lib/urutGuru'
import EmptyState from '@/components/ui/EmptyState'
import { SearchX } from 'lucide-react'
import Tautan from '@/components/ui/Tautan'

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

const keterangan = (g: { asalSekolah: string | null; statusPegawai: string | null }) =>
  [g.asalSekolah, LABEL_PEGAWAI[g.statusPegawai ?? '']].filter(Boolean).join(' · ')

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

  // Parameter yang dipertahankan di semua tautan (urut, filter, pencarian, jumlah per halaman).
  const adaFilter = !!(filter !== 'semua' || q || filterSekolah || filterPegawai)
  const dasar = {
    periode: periode?.id, q, status: filter !== 'semua' ? filter : undefined,
    asalSekolah: filterSekolah, statusPegawai: filterPegawai,
    urut: urutKolom !== 'nama' || urutArah !== 'asc' ? urutKolom : undefined,
    arah: urutKolom !== 'nama' || urutArah !== 'asc' ? urutArah : undefined,
  }
  const tautan = (ubah: Record<string, string | number | undefined>) => bangunTautan({ ...dasar, per: halaman.per }, { hal: undefined, ...ubah })
  const urutUntuk = (kolom: typeof urutKolom) => {
    const aktif = urutKolom === kolom
    return { arah: aktif ? urutArah : null, href: tautan({ urut: kolom, arah: arahBerikut(aktif ? urutArah : null) }) }
  }
  const hapusFilter = periode ? `?periode=${periode.id}` : '?'

  const kolom: Kolom<(typeof guru)[number]>[] = [
    {
      id: 'nama', label: 'Nama', urut: urutUntuk('nama'), tanpaLabelPonsel: true,
      sel: (g) => (
        <>
          {/* Tautan memanjang: area klik seluruh baris lewat CSS, jadi bekerja tanpa JavaScript */}
          <Tautan href={`/admin/guru/${g.id}`} className="baris-guru__tautan" prefetch={false}><b>{g.nama}</b></Tautan>
          {keterangan(g) && <div className="kartu-sub">{keterangan(g)}</div>}
        </>
      ),
    },
    { id: 'nip', label: 'NIP / NIK', sel: (g) => g.username },
    ...(periode ? [
      {
        id: 'progres', label: 'Progres', urut: urutUntuk('progres'),
        sel: (g: (typeof guru)[number]) => {
          const s = status.get(g.id)
          if (!g.disetujui || !s) return <span className="redup">-</span>
          return (
            <div className="progres-mini">
              <ProgressBar nilai={s.jumlahSah} maks={s.jumlahWajib} />
              <span className="progres-mini__teks">{s.jumlahSah}/{s.jumlahWajib}</span>
            </div>
          )
        },
      },
      {
        id: 'status', label: 'Status',
        sel: (g: (typeof guru)[number]) => {
          const s = status.get(g.id)
          return !g.disetujui || !s ? <span className="redup">-</span> : <span className={`label ${s.label.replace(/ /g, '-')}`}>{s.label}</span>
        },
      },
      {
        id: 'aktivitas', label: 'Aktivitas', urut: urutUntuk('aktivitas'),
        sel: (g: (typeof guru)[number]) => <span className="redup">{aktivitasMap.get(g.id) ? formatAktivitas(aktivitasMap.get(g.id)!) : '-'}</span>,
      },
    ] : []),
    {
      id: 'akun', label: 'Akun',
      sel: (g) => !g.disetujui ? <span className="label Perlu-dicek">Menunggu persetujuan</span>
        : g.aktif ? 'Aktif' : <strong className="galat">Nonaktif</strong>,
    },
    {
      id: 'aksi', label: 'Aksi', kelas: 'nowrap', tanpaLabelPonsel: true,
      sel: (g) => <AksiGuru guru={{ id: g.id, nama: g.nama, username: g.username, aktif: g.aktif, disetujui: g.disetujui }} />,
    },
  ]

  return (
    <div className="halaman-tabel">
      <PageHeader
        judul="Guru"
        keterangan={periode ? `Status dokumen ${periode.nama}${periode.dibuka ? ' (dibuka)' : ' (ditutup)'} · ${totalAktif} guru aktif` : undefined}
        cari={{ nama: 'q', nilai: q, label: 'Cari nama atau NIP', placeholder: 'Cari nama, NIP…', formId: 'filter-guru' }}
        aksi={<>
          <Tautan className="tombol-garis" href="/admin/guru/impor">Impor guru</Tautan>
          <Tautan className="tombol" href="/admin/guru/tambah">Tambah guru</Tautan>
        </>}
      />
      <BannerSandi />

      <FormOtomatis id="filter-guru" className="filter-bar" aria-label="Filter guru" tombolTanpaJs="Saring">
        {periode && <input type="hidden" name="periode" value={periode.id} />}
        {filter !== 'semua' && <input type="hidden" name="status" value={filter} />}
        {(urutKolom !== 'nama' || urutArah !== 'asc') && (
          <>
            <input type="hidden" name="urut" value={urutKolom} />
            <input type="hidden" name="arah" value={urutArah} />
          </>
        )}
        <input type="hidden" name="per" value={halaman.per} />
        <div className="chip-status" role="group" aria-label="Filter status">
          {FILTER.map(([v, l]) => {
            const jumlah = v === 'semua' ? 0 : v === 'menunggu' ? hitungMenunggu : hitung(LABEL[v] ?? '')
            return (
              <Tautan key={v} href={tautan({ status: v === 'semua' ? undefined : v })} className="chip-filter" aria-current={filter === v ? 'true' : undefined}>
                {l}{jumlah > 0 ? <span className="chip-filter__angka">{jumlah}</span> : null}
              </Tautan>
            )
          })}
        </div>
        <select name="asalSekolah" aria-label="Asal sekolah" defaultValue={filterSekolah}>
          <option value="">Semua sekolah</option>
          {daftarSekolah.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="statusPegawai" aria-label="Jenis pegawai" defaultValue={filterPegawai}>
          <option value="">Semua jenis pegawai</option>
          {STATUS_PEGAWAI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {adaFilter && <Tautan href={hapusFilter} className="hapus-filter">Hapus filter</Tautan>}
      </FormOtomatis>

      <DataTable
        keterangan="Daftar guru"
        satuan="guru"
        kolom={kolom}
        baris={guru}
        kunciBaris={(g) => g.id}
        kelasBaris={(g) => `baris-guru${g.disetujui ? '' : ' baris-menunggu'}`}
        ringkasan={halaman}
        dasar={dasar}
        kosong={
          <EmptyState ikon={<SearchX size={32} />} teks="Tidak ada guru yang cocok." aksi={
            adaFilter ? <Tautan href={hapusFilter} className="hapus-filter">Hapus filter</Tautan> : undefined
          } />
        }
      />
    </div>
  )
}
