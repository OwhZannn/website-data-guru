import { CalendarX, CheckCircle2 } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { prisma } from '@/lib/db'
import { halamanAdmin } from '@/lib/halaman'
import { pilihPeriode, semuaPeriode } from '@/lib/pilihPeriode'
import { potongHalaman, nomorHalaman } from '@/lib/paginasi'
import Breadcrumb from '@/components/ui/Breadcrumb'
import PilihPeriode from '@/components/PilihPeriode'
import { ZONA_WAKTU } from '@/lib/waktu'

export const dynamic = 'force-dynamic'

const waktuWita = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: ZONA_WAKTU, dateStyle: 'medium', timeStyle: 'short' }).format(d) + ' WITA'

export default async function HalamanAntrean({ searchParams }: {
  searchParams: Promise<{ periode?: string; dok?: string; sekolah?: string; hal?: string; per?: string }>
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

  // Filter sekolah (client-side potong dari array sudah diambil)
  const terfilter = sp.sekolah
    ? semua.filter((d) => d.guru.asalSekolah?.toLowerCase().includes(sp.sekolah!.toLowerCase()))
    : semua

  // Daftar jenis dokumen dan sekolah unik untuk filter
  const jenisDokumen = periode
    ? await prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true }, orderBy: { urutan: 'asc' }, select: { id: true, nama: true } })
    : []
  const sekolahUnik = [...new Set(semua.map((d) => d.guru.asalSekolah).filter(Boolean) as string[])].sort()

  const halaman = potongHalaman(terfilter, sp.hal, sp.per)
  const nomor = nomorHalaman(halaman.hal, halaman.jumlahHal)

  function urlFilter(o: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    if (periode) p.set('periode', periode.id)
    const merged = { dok: sp.dok, sekolah: sp.sekolah, ...o }
    if (merged.dok) p.set('dok', merged.dok)
    if (merged.sekolah) p.set('sekolah', merged.sekolah)
    return `/admin/antrean?${p}`
  }

  return (
    <>
      <Breadcrumb butir={[{ href: '/admin', label: 'Beranda' }, { label: 'Antrean Pemeriksaan' }]} />
      <div className="judul-aksi mb-s4">
        <h1>Antrean Pemeriksaan</h1>
        {daftarPeriode.length >= 2 && (
          <PilihPeriode daftar={daftarPeriode} dipilih={periode?.id ?? ''} />
        )}
      </div>

      {!periode && (
        <EmptyState ikon={<CalendarX size={28} />} teks="Tidak ada periode yang sedang dibuka." aksi={<a className="tombol-garis" href="/admin">Kembali ke beranda</a>} />
      )}

      {periode && (
        <>
          {/* Filter */}
          <form method="GET" action="/admin/antrean" className="form-filter">
            <input type="hidden" name="periode" value={periode.id} />
            <label className="medan">
              <span className="medan__label">Jenis Dokumen</span>
              <select name="dok" defaultValue={sp.dok ?? ''}>
                <option value="">Semua</option>
                {jenisDokumen.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </label>
            <label className="medan">
              <span className="medan__label">Sekolah</span>
              <select name="sekolah" defaultValue={sp.sekolah ?? ''}>
                <option value="">Semua</option>
                {sekolahUnik.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <button type="submit">Terapkan</button>
            {(sp.dok || sp.sekolah) && (
              <a href={urlFilter({ dok: undefined, sekolah: undefined })} className="tombol-sekunder">Reset</a>
            )}
          </form>

          <p className="redup mb-s3">
            Periode: <strong>{periode.nama}</strong>
            {periode.dibuka ? '' : ' (ditutup)'}{' '}
            — {halaman.total} dokumen menunggu
            {sp.dok || sp.sekolah ? ` (${terfilter.length} setelah filter)` : ''}, diurutkan dari yang paling lama.
          </p>

          {halaman.isi.length === 0 ? (
            <EmptyState ikon={<CheckCircle2 size={28} />} teks="Tidak ada dokumen yang menunggu." aksi={<a className="tombol-garis" href="/admin">Kembali ke beranda</a>} />
          ) : (
            <>
              <div className="geser">
                <table className="tabel-lengket">
                  <thead>
                    <tr>
                      <th>Guru</th>
                      <th>NIP / NIK</th>
                      <th>Sekolah</th>
                      <th>Dokumen</th>
                      <th>Diunggah</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {halaman.isi.map((d) => (
                      <tr key={d.id}>
                        <td><a className="tautan-nama" href={`/admin/guru/${d.guruId}?periode=${periode.id}`}>{d.guru.nama}</a></td>
                        <td>{d.guru.username}</td>
                        <td>{d.guru.asalSekolah ?? '—'}</td>
                        <td>{d.dokumen.nama}</td>
                        <td>{d.diunggahPada ? waktuWita(d.diunggahPada) : '—'}</td>
                        <td>
                          <a className="tombol-tabel" href={`/admin/guru/${d.guruId}?periode=${periode.id}&dok=${d.id}`}>
                            Periksa →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Paginasi */}
              {halaman.jumlahHal > 1 && (
                <div className="paginasi">
                  <span className="redup teks-sm">
                    {halaman.dari}–{halaman.sampai} dari {halaman.total}
                  </span>
                  <nav className="paginasi-nomor" aria-label="Halaman">
                    {nomor.map((n, i) =>
                      n === null ? (
                        <span key={`celah-${i}`} className="celah">…</span>
                      ) : (
                        <a
                          key={n}
                          href={`/admin/antrean?${new URLSearchParams({ ...(periode ? { periode: periode.id } : {}), ...(sp.dok ? { dok: sp.dok } : {}), ...(sp.sekolah ? { sekolah: sp.sekolah } : {}), hal: String(n), per: String(halaman.per) })}`}
                          aria-current={n === halaman.hal ? 'page' : undefined}
                        >
                          {n}
                        </a>
                      ),
                    )}
                  </nav>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
