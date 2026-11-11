import { CalendarX, CheckCircle2 } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { potongHalaman } from '@/lib/paginasi'
import DataTable, { type Kolom } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import FormOtomatis from '@/components/FormOtomatis'
import { bangunTautan } from '@/lib/dataTable'
import { ZONA_WAKTU } from '@/lib/waktu'
import Tautan from '@/components/ui/Tautan'
import Combobox from '@/components/ui/Combobox'

export const dynamic = 'force-dynamic'

const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'medium', timeStyle: 'short' }).format(d) + ' WITA'

export default async function HalamanAntrean({ searchParams }: {
  searchParams: Promise<{ periode?: string; dok?: string; sekolah?: string; q?: string; hal?: string; per?: string }>
}) {
  await halamanAdmin()
  const sp = await searchParams
  const daftarPeriode = await semuaPeriode()
  const periode = pilihPeriode(daftarPeriode, sp.periode)

  const semua = periode
    ? await prisma.dokumenGuru.findMany({
        where: {
          periodeId: periode.id,
          status: 'MENUNGGU',
          ...(sp.dok ? { dokumenId: sp.dok } : {}),
        },
        include: {
          guru: { select: { id: true, nama: true, username: true, asalSekolah: true } },
          dokumen: { select: { id: true, nama: true } },
        },
        orderBy: { diunggahPada: 'asc' },
      })
    : []

  // Pencarian nama/NIP dan filter sekolah dikerjakan di memori dari daftar yang sudah diambil.
  const q = (sp.q ?? '').trim().toLowerCase()
  const terfilter = semua.filter((d) =>
    (!sp.sekolah || d.guru.asalSekolah?.toLowerCase().includes(sp.sekolah.toLowerCase())) &&
    (!q || d.guru.nama.toLowerCase().includes(q) || d.guru.username.toLowerCase().includes(q)))

  // Daftar jenis dokumen dan sekolah unik untuk filter
  const jenisDokumen = periode
    ? await prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true }, orderBy: { urutan: 'asc' }, select: { id: true, nama: true } })
    : []
  const sekolahUnik = [...new Set(semua.map((d) => d.guru.asalSekolah).filter(Boolean) as string[])].sort()

  const halaman = potongHalaman(terfilter, sp.hal, sp.per)
  const dasar = { periode: periode?.id, q: sp.q?.trim(), dok: sp.dok, sekolah: sp.sekolah }
  const adaFilter = !!(sp.dok || sp.sekolah || q)
  const hapusFilter = bangunTautan({ periode: periode?.id })
  const kolom: Kolom<(typeof halaman.isi)[number]>[] = [
    { id: 'guru', label: 'Guru', tanpaLabelPonsel: true, sel: (d) => <Tautan className="tautan-nama" href={`/admin/guru/${d.guruId}?periode=${periode!.id}`} prefetch={false}>{d.guru.nama}</Tautan> },
    { id: 'nip', label: 'NIP / NIK', sel: (d) => d.guru.username },
    { id: 'sekolah', label: 'Sekolah', sel: (d) => d.guru.asalSekolah ?? '—' },
    { id: 'dokumen', label: 'Dokumen', sel: (d) => d.dokumen.nama },
    { id: 'diunggah', label: 'Diunggah', sel: (d) => (d.diunggahPada ? waktuWita(d.diunggahPada) : '—') },
    {
      id: 'aksi', label: 'Aksi', tanpaLabelPonsel: true, kelas: 'nowrap',
      sel: (d) => <Tautan className="tombol-tabel" href={`/admin/guru/${d.guruId}?periode=${periode!.id}&dok=${d.id}`} prefetch={false}>Periksa →</Tautan>,
    },
  ]

  return (
    <div className="halaman-tabel">
      <PageHeader
        judul="Antrean pemeriksaan"
        keterangan={periode
          ? `${periode.nama}${periode.dibuka ? '' : ' (ditutup)'} · ${semua.length} dokumen menunggu, terlama di atas`
          : undefined}
        cari={periode ? { nama: 'q', nilai: sp.q?.trim() ?? '', label: 'Cari nama atau NIP guru', placeholder: 'Cari nama, NIP…', formId: 'filter-antrean' } : undefined}
      />

      {!periode ? (
        <EmptyState ikon={<CalendarX size={28} />} teks="Tidak ada periode yang sedang dibuka." aksi={<Tautan className="tombol-garis" href="/admin">Kembali ke beranda</Tautan>} />
      ) : (
        <>
          <FormOtomatis id="filter-antrean" className="filter-bar" aria-label="Filter antrean" tombolTanpaJs="Saring">
            <input type="hidden" name="periode" value={periode.id} />
            <Combobox
              name="dok"
              ariaLabel="Jenis dokumen"
              kosongLabel="Semua jenis dokumen"
              defaultValue={sp.dok ?? ''}
              opsi={jenisDokumen.map((d) => [d.id, d.nama] as [string, string])}
            />
            <Combobox
              name="sekolah"
              ariaLabel="Sekolah"
              kosongLabel="Semua sekolah"
              defaultValue={sp.sekolah ?? ''}
              opsi={sekolahUnik}
            />
            {adaFilter && <Tautan href={hapusFilter} className="hapus-filter">Hapus filter</Tautan>}
          </FormOtomatis>

          <DataTable
            keterangan="Antrean pemeriksaan"
            satuan="dokumen"
            kolom={kolom}
            baris={halaman.isi}
            kunciBaris={(d) => d.id}
            ringkasan={halaman}
            dasar={dasar}
            kosong={
              <EmptyState
                ikon={<CheckCircle2 size={28} />}
                teks={adaFilter ? 'Tidak ada dokumen yang cocok dengan filter.' : 'Tidak ada dokumen yang menunggu.'}
                aksi={adaFilter ? <Tautan className="hapus-filter" href={hapusFilter}>Hapus filter</Tautan> : <Tautan className="tombol-garis" href="/admin">Kembali ke beranda</Tautan>}
              />
            }
          />
        </>
      )}
    </div>
  )
}
