import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { catatRiwayat, type AksiRiwayat } from '@/lib/riwayat'
import { GalatPengguna } from '@/lib/galat'

export const ALASAN_MAKS = 1000
const TIDAK_MENUNGGU = 'Dokumen ini tidak sedang menunggu pemeriksaan'
const BELUM_DIPUTUSKAN = 'Dokumen ini belum diputuskan'
const STATUS_SAMA = 'Status baru sama dengan status sekarang'

function periksaAlasan(alasan: unknown, pesanKosong: string): string {
  const bersih = typeof alasan === 'string' ? alasan.trim() : ''
  if (!bersih) throw new GalatPengguna(pesanKosong)
  if (bersih.length > ALASAN_MAKS) throw new GalatPengguna(`Alasan maksimal ${ALASAN_MAKS} karakter`)
  return bersih
}

const sibuk = (e: unknown) =>
  (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') ||
  (e instanceof Error && /SQLITE_BUSY|database is locked/i.test(e.message))

/**
 * Tulis keputusan dan riwayatnya dalam SATU transaksi. Pembaruan bersyarat (status harus `dari`)
 * mengambil kunci tulis lebih dulu, lalu baris dibaca ulang di dalam transaksi; keputusan yang
 * kalah balapan gagal dengan galat, tidak pernah menimpa diam-diam.
 */
async function putuskan(o: {
  dokumenGuruId: string
  adminId: string
  dari: string[]
  ke: 'SAH' | 'DITOLAK'
  alasan: string | null
  aksi: AksiRiwayat
  pesanStatus: string
}): Promise<void> {
  const jalan = () =>
    prisma.$transaction(async (tx) => {
      const { count } = await tx.dokumenGuru.updateMany({
        where: { id: o.dokumenGuruId, status: { in: o.dari }, fileId: { not: null } },
        data: {
          status: o.ke,
          alasan: o.ke === 'SAH' ? null : o.alasan,
          diperiksaOleh: o.adminId,
          diperiksaPada: new Date(),
        },
      })
      const baris = await tx.dokumenGuru.findUnique({ where: { id: o.dokumenGuruId } })
      if (!baris) throw new GalatPengguna('Dokumen tidak ditemukan')
      if (count !== 1) {
        if (o.aksi === 'batalkan' && (baris.status === 'MENUNGGU' || baris.status === 'BELUM')) {
          throw new GalatPengguna(BELUM_DIPUTUSKAN)
        }
        throw new GalatPengguna(o.pesanStatus)
      }
      await catatRiwayat(
        {
          periodeId: baris.periodeId, guruId: baris.guruId, dokumenId: baris.dokumenId,
          aksi: o.aksi, alasan: o.alasan ?? undefined, oleh: o.adminId, olehTipe: 'admin',
        },
        tx,
      )
    })
  try {
    await jalan()
  } catch (e) {
    if (!sibuk(e)) throw e
    await jalan() // satu kali ulang; percobaan kedua membaca status terbaru
  }
}

export function sahkanDokumen(m: { dokumenGuruId: string; adminId: string }): Promise<void> {
  return putuskan({ ...m, dari: ['MENUNGGU'], ke: 'SAH', alasan: null, aksi: 'sahkan', pesanStatus: TIDAK_MENUNGGU })
}

export async function tolakDokumen(m: { dokumenGuruId: string; adminId: string; alasan: string }): Promise<void> {
  const alasan = periksaAlasan(m.alasan, 'Alasan penolakan wajib diisi')
  return putuskan({ ...m, dari: ['MENUNGGU'], ke: 'DITOLAK', alasan, aksi: 'tolak', pesanStatus: TIDAK_MENUNGGU })
}

export async function batalkanKeputusan(m: {
  dokumenGuruId: string
  adminId: string
  alasan: string
  statusBaru: 'SAH' | 'DITOLAK'
}): Promise<void> {
  const alasan = periksaAlasan(m.alasan, 'Alasan pembatalan wajib diisi')
  if (m.statusBaru !== 'SAH' && m.statusBaru !== 'DITOLAK') throw new GalatPengguna('Status baru tidak sah')
  const dari = m.statusBaru === 'SAH' ? 'DITOLAK' : 'SAH'
  // Pada SAH alasan baris dikosongkan; alasan pembatalan tetap tercatat di riwayat.
  await putuskan({
    dokumenGuruId: m.dokumenGuruId, adminId: m.adminId, dari: [dari], ke: m.statusBaru,
    alasan, aksi: 'batalkan', pesanStatus: STATUS_SAMA,
  })
}
