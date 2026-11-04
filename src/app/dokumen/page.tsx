import { redirect } from 'next/navigation'
import { wajibGuru } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hitungStatusGuru } from '@/lib/status'
import { daftarRiwayatDokumen } from '@/lib/riwayat'
import { tanggalLokal } from '@/lib/waktu'
import KartuDokumen from '@/components/KartuDokumen'
import TombolKeluar from '@/components/TombolKeluar'

export const dynamic = 'force-dynamic'

export default async function Dokumen() {
  let guru
  try {
    guru = await wajibGuru()
  } catch {
    redirect('/masuk')
  }

  const dibuka = await prisma.periode.findFirst({ where: { dibuka: true } })
  const periode = dibuka ?? (await prisma.periode.findFirst({ orderBy: { dibuatPada: 'desc' } }))
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
      {!dibuka && <p role="status"><strong>Masa pengunggahan sedang ditutup.</strong></p>}
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
                bolehUnggah={!!dibuka}
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
