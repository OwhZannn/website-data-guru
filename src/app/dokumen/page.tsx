import { halamanGuru } from '@/lib/halaman'
import { prisma } from '@/lib/db'
import { hitungStatusGuru } from '@/lib/status'
import { daftarRiwayatDokumen } from '@/lib/riwayat'
import { periodeTerlihatGuru, pilihPeriode } from '@/lib/pilihPeriode'
import PilihPeriode from '@/components/PilihPeriode'
import { tanggalLokal } from '@/lib/waktu'
import KartuDokumen from '@/components/KartuDokumen'
import TombolKeluar from '@/components/TombolKeluar'

export const dynamic = 'force-dynamic'

export default async function Dokumen({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const guru = await halamanGuru()
  const sp = await searchParams

  // Hanya periode milik guru ini (plus periode saat ini); id asing jatuh ke bawaan.
  const daftarPeriode = await periodeTerlihatGuru(guru.id)
  const periode = pilihPeriode(daftarPeriode, sp.periode)
  const dibuka = periode?.dibuka ?? false
  const adaDibuka = daftarPeriode.some((p) => p.dibuka)
  const dokumen = periode
    ? await prisma.daftarDokumen.findMany({ where: { periodeId: periode.id, aktif: true }, orderBy: { urutan: 'asc' } })
    : []
  const baris = periode ? await prisma.dokumenGuru.findMany({ where: { periodeId: periode.id, guruId: guru.id } }) : []
  const status = hitungStatusGuru(dokumen, baris)
  const riwayat = await Promise.all(dokumen.map((d) => daftarRiwayatDokumen(guru.id, d.id)))

  return (
    <main>
      <div className="atas">
        <h1 style={{ margin: 0, flex: 1 }}>Dokumen Saya</h1>
        <a href="/ganti-sandi">Ganti kata sandi</a>
        <TombolKeluar />
      </div>
      <p>{guru.nama}</p>
      {!adaDibuka && <p role="status"><strong>Masa pengunggahan sedang ditutup.</strong></p>}
      {periode && <PilihPeriode daftar={daftarPeriode} dipilih={periode.id} />}
      {periode && !dibuka && adaDibuka && <p role="status">Periode ini sudah ditutup; hanya dapat dilihat.</p>}
      {periode && dokumen.length > 0 && (
        <>
          <p>{periode.nama}</p>
          <p><strong>Progres: {status.jumlahSah} dari {status.jumlahWajib} dokumen sah</strong></p>
          {dokumen.map((d, i) => {
            const b = baris.find((x) => x.dokumenId === d.id)
            return (
              <KartuDokumen
                key={d.id}
                dokumenId={d.id}
                nama={d.nama}
                status={b?.status ?? 'BELUM'}
                alasan={b?.alasan ?? null}
                namaFile={b?.namaFile ?? null}
                bolehUnggah={dibuka}
                riwayat={riwayat[i].map((r) => ({
                  id: r.id,
                  aksi: r.aksi,
                  alasan: r.alasan,
                  waktuTeks: tanggalLokal(r.waktu),
                }))}
              />
            )
          })}
        </>
      )}
    </main>
  )
}
