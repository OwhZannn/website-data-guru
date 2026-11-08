import { prisma } from '@/lib/db'
import { hitungStatusGuru } from '@/lib/status'
import { namaPelakuRiwayat, TIDAK_DIKENAL } from '@/lib/riwayat'
import type { Guru } from '@prisma/client'

export type ItemAntrean = {
  dokumenGuruId: string
  guruId: string
  namaGuru: string
  namaDokumen: string
  /** Waktu Riwayat aksi unggah/ganti_file terbaru; fallback: updatedAt DokumenGuru. */
  menungguSejak: Date
}

export type ItemAktivitas = {
  id: string
  aksi: string
  waktu: Date
  namaPelaku: string
  namaDokumen: string | null
  namaGuru: string | null
  periodeId: string
}

export type ItemPerDokumen = {
  id: string
  nama: string
  sah: number
  menunggu: number
  ditolak: number
  belum: number
}

export type StatusGuruRingkas = {
  lengkap: number
  perluDicek: number
  adaDitolak: number
  belumMulai: number
}

export type RingkasanDasbor = {
  jumlahGuruAktif: number
  statusGuru: StatusGuruRingkas
  statusDokumen: { sah: number; menunggu: number; ditolak: number }
  perDokumen: ItemPerDokumen[]
  antrean: ItemAntrean[]
  totalAntrean: number
  perluPersetujuan: number
  aktivitasTerbaru: ItemAktivitas[]
}

type GuruBaris = Pick<
  Guru,
  | 'id'
  | 'aktif'
  | 'disetujui'
  | 'statusPegawai'
  | 'jabatan'
  | 'sertifikasiBaru'
  | 'tugasLabPerpus'
  | 'tugasTbq'
  | 'tugasRohis'
  | 'tugasImtaq'
  | 'tugasInklusi'
  | 'tugasWakasek'
  | 'tugasOsis'
  | 'tugasWaliKelas'
  | 'tugasPiket'
  | 'tugasGuruWali'
>

/**
 * Mengambil semua data ringkasan dasbor admin untuk satu periode.
 * Menggunakan groupBy/aggregasi; menghindari N+1.
 */
export async function ringkasanDasbor(periodeId: string): Promise<RingkasanDasbor> {
  // 1. Semua guru + semua DokumenGuru dalam periode ini sekaligus
  const [semuaGuru, daftarDokumen, grupDokumenGuru, perluPersetujuan] = await Promise.all([
    prisma.guru.findMany({
      select: {
        id: true, aktif: true, disetujui: true,
        statusPegawai: true, jabatan: true, sertifikasiBaru: true,
        tugasLabPerpus: true, tugasTbq: true, tugasRohis: true,
        tugasImtaq: true, tugasInklusi: true, tugasWakasek: true,
        tugasOsis: true, tugasWaliKelas: true, tugasPiket: true, tugasGuruWali: true,
      },
    }),
    prisma.daftarDokumen.findMany({
      where: { periodeId, aktif: true },
      orderBy: { urutan: 'asc' },
    }),
    // Pivot: jumlah per (dokumenId × status)
    prisma.dokumenGuru.groupBy({
      by: ['dokumenId', 'status'],
      where: { periodeId },
      _count: { _all: true },
    }),
    prisma.guru.count({ where: { disetujui: false } }),
  ])

  const guruAktif = semuaGuru.filter((g) => g.aktif && g.disetujui)
  const jumlahGuruAktif = guruAktif.length

  // 2. Ambil DokumenGuru per guru untuk menghitung status guru (hanya periode ini)
  const dokumenPerGuru = await prisma.dokumenGuru.findMany({
    where: { periodeId, guruId: { in: guruAktif.map((g) => g.id) } },
    select: { guruId: true, dokumenId: true, status: true },
  })

  const dokumenByGuru = new Map<string, { dokumenId: string; status: string }[]>()
  for (const dg of dokumenPerGuru) {
    if (!dokumenByGuru.has(dg.guruId)) dokumenByGuru.set(dg.guruId, [])
    dokumenByGuru.get(dg.guruId)!.push(dg)
  }

  // 3. Hitung status per guru (sama dengan halaman Guru)
  const statusGuru: StatusGuruRingkas = { lengkap: 0, perluDicek: 0, adaDitolak: 0, belumMulai: 0 }
  for (const guru of guruAktif) {
    const dgGuru = dokumenByGuru.get(guru.id) ?? []
    const st = hitungStatusGuru(daftarDokumen, dgGuru, guru)
    if (st.label === 'Lengkap') statusGuru.lengkap++
    else if (st.label === 'Perlu dicek') statusGuru.perluDicek++
    else if (st.label === 'Ada yang ditolak') statusGuru.adaDitolak++
    else statusGuru.belumMulai++
  }

  // 4. Status dokumen global (semua DokumenGuru periode ini)
  const statusDokumen = { sah: 0, menunggu: 0, ditolak: 0 }
  for (const g of grupDokumenGuru) {
    if (g.status === 'SAH') statusDokumen.sah += g._count._all
    else if (g.status === 'MENUNGGU') statusDokumen.menunggu += g._count._all
    else if (g.status === 'DITOLAK') statusDokumen.ditolak += g._count._all
  }

  // 5. Per dokumen: pivot dari grup
  const pivotDok = new Map<string, { sah: number; menunggu: number; ditolak: number }>()
  for (const g of grupDokumenGuru) {
    if (!pivotDok.has(g.dokumenId)) pivotDok.set(g.dokumenId, { sah: 0, menunggu: 0, ditolak: 0 })
    const p = pivotDok.get(g.dokumenId)!
    if (g.status === 'SAH') p.sah += g._count._all
    else if (g.status === 'MENUNGGU') p.menunggu += g._count._all
    else if (g.status === 'DITOLAK') p.ditolak += g._count._all
  }

  const perDokumen: ItemPerDokumen[] = daftarDokumen.map((d) => {
    const p = pivotDok.get(d.id) ?? { sah: 0, menunggu: 0, ditolak: 0 }
    return {
      id: d.id,
      nama: d.nama,
      sah: p.sah,
      menunggu: p.menunggu,
      ditolak: p.ditolak,
      belum: jumlahGuruAktif - p.sah - p.menunggu - p.ditolak,
    }
  })

  // 6. Antrean: semua DokumenGuru MENUNGGU
  const [antreanRaw, daftarDokumenMap] = await Promise.all([
    prisma.dokumenGuru.findMany({
      where: { periodeId, status: 'MENUNGGU' },
      select: { id: true, guruId: true, dokumenId: true, diunggahPada: true },
    }),
    // Sudah ada di daftarDokumen di atas; buat map id→nama
    Promise.resolve(new Map(daftarDokumen.map((d) => [d.id, d.nama]))),
  ])

  const totalAntrean = antreanRaw.length

  // Ambil riwayat unggah/ganti_file per DokumenGuru (untuk waktu menunggu)
  // Kueri massal: satu query, grup di memori
  const riwayatAntrean = antreanRaw.length
    ? await prisma.riwayat.findMany({
        where: {
          periodeId,
          dokumenId: { in: antreanRaw.map((a) => a.dokumenId) },
          guruId: { in: antreanRaw.map((a) => a.guruId) },
          aksi: { in: ['unggah', 'ganti_file'] },
        },
        orderBy: { waktu: 'desc' },
      })
    : []

  // Index: "guruId:dokumenId" → waktu terbaru
  const riwayatIdx = new Map<string, Date>()
  for (const r of riwayatAntrean) {
    if (!r.guruId || !r.dokumenId) continue
    const kunci = `${r.guruId}:${r.dokumenId}`
    if (!riwayatIdx.has(kunci)) riwayatIdx.set(kunci, r.waktu)
  }

  // Ambil nama guru massal
  const idGuruAntrean = [...new Set(antreanRaw.map((a) => a.guruId))]
  const guruMap = new Map(
    (await prisma.guru.findMany({
      where: { id: { in: idGuruAntrean } },
      select: { id: true, nama: true },
    })).map((g) => [g.id, g.nama])
  )

  // Sort: yang paling lama menunggu dulu (tanggal terkecil)
  const antreanSorted = antreanRaw
    .map((a) => {
      const kunci = `${a.guruId}:${a.dokumenId}`
      const menungguSejak = riwayatIdx.get(kunci) ?? a.diunggahPada ?? new Date(0)
      return {
        dokumenGuruId: a.id,
        guruId: a.guruId,
        namaGuru: guruMap.get(a.guruId) ?? TIDAK_DIKENAL,
        namaDokumen: daftarDokumenMap.get(a.dokumenId) ?? a.dokumenId,
        menungguSejak,
      }
    })
    .sort((a, b) => a.menungguSejak.getTime() - b.menungguSejak.getTime())

  const antrean = antreanSorted.slice(0, 10)

  // 7. Aktivitas terbaru: 15 baris riwayat
  const riwayatTerbaru = await prisma.riwayat.findMany({
    where: { periodeId },
    orderBy: [{ waktu: 'desc' }, { id: 'desc' }],
    take: 15,
  })

  // Nama dokumen: gunakan map yang sudah ada
  // Ambil nama guru untuk riwayat
  const idGuruRiwayat = [...new Set(riwayatTerbaru.filter((r) => r.guruId).map((r) => r.guruId!))]
  const guruRiwayatMap = idGuruRiwayat.length
    ? new Map(
        (await prisma.guru.findMany({
          where: { id: { in: idGuruRiwayat } },
          select: { id: true, nama: true },
        })).map((g) => [g.id, g.nama])
      )
    : new Map<string, string>()

  const pelakuMap = await namaPelakuRiwayat(riwayatTerbaru)

  // Nama dokumen perlu diambil juga dari DaftarDokumen selain periode ini
  // (untuk riwayat lintas periode — aman: pakai map yang ada, fallback null)
  const aktivitasTerbaru: ItemAktivitas[] = riwayatTerbaru.map((r) => ({
    id: r.id,
    aksi: r.aksi,
    waktu: r.waktu,
    namaPelaku: pelakuMap.get(r.id) ?? TIDAK_DIKENAL,
    namaDokumen: r.dokumenId ? (daftarDokumenMap.get(r.dokumenId) ?? null) : null,
    namaGuru: r.guruId ? (guruRiwayatMap.get(r.guruId) ?? TIDAK_DIKENAL) : null,
    periodeId: r.periodeId,
  }))

  return {
    jumlahGuruAktif,
    statusGuru,
    statusDokumen,
    perDokumen,
    antrean,
    totalAntrean,
    perluPersetujuan,
    aktivitasTerbaru,
  }
}
