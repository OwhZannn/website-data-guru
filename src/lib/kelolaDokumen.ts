import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { catatRiwayat } from '@/lib/riwayat'
import { hitungStatusGuru } from '@/lib/status'
import { GalatPengguna } from '@/lib/galat'

export const NAMA_MAKS = 200

function bersihkanNama(nama: unknown): string {
  const bersih = typeof nama === 'string' ? nama.trim() : ''
  if (!bersih) throw new GalatPengguna('Nama dokumen wajib diisi')
  if (bersih.length > NAMA_MAKS) throw new GalatPengguna(`Nama dokumen maksimal ${NAMA_MAKS} karakter`)
  return bersih
}

async function pastikanNamaBebas(tx: Prisma.TransactionClient, periodeId: string, nama: string, kecualiId?: string) {
  const aktif = await tx.daftarDokumen.findMany({ where: { periodeId, aktif: true }, select: { id: true, nama: true } })
  const kecil = nama.toLowerCase()
  if (aktif.some((d) => d.id !== kecualiId && d.nama.toLowerCase() === kecil)) {
    throw new GalatPengguna('Dokumen dengan nama ini sudah ada')
  }
}

async function ambilDokumen(tx: Prisma.TransactionClient, dokumenId: string) {
  const dok = await tx.daftarDokumen.findUnique({ where: { id: dokumenId } })
  if (!dok) throw new GalatPengguna('Dokumen tidak ditemukan')
  return dok
}

/**
 * Berapa guru yang kini lengkap tetapi akan kembali tidak lengkap bila satu dokumen aktif
 * ditambahkan. Bila `dokumenId` (dokumen nonaktif yang diaktifkan kembali) diberikan, guru yang
 * sudah berstatus SAH pada dokumen itu tidak dihitung.
 */
async function hitungDampak(tx: Prisma.TransactionClient, periodeId: string, dokumenId?: string): Promise<number> {
  const dokumen = await tx.daftarDokumen.findMany({ where: { periodeId, aktif: true }, select: { id: true, aktif: true } })
  if (dokumen.length === 0) return 0
  const baris = await tx.dokumenGuru.findMany({
    where: { periodeId, guru: { aktif: true } },
    select: { guruId: true, dokumenId: true, status: true },
  })
  const perGuru = new Map<string, typeof baris>()
  for (const b of baris) perGuru.set(b.guruId, [...(perGuru.get(b.guruId) ?? []), b])
  let jumlah = 0
  for (const rows of perGuru.values()) {
    if (!hitungStatusGuru(dokumen, rows).lengkap) continue
    if (dokumenId && rows.some((r) => r.dokumenId === dokumenId && r.status === 'SAH')) continue
    jumlah++
  }
  return jumlah
}

export function hitungDampakDokumenBaru(periodeId: string, dokumenId?: string): Promise<number> {
  return prisma.$transaction((tx) => hitungDampak(tx, periodeId, dokumenId))
}

export async function tambahDokumen(m: {
  periodeId: string
  nama: string
  urutan?: number
  adminId: string
}): Promise<{ akanTidakLengkap: number }> {
  const nama = bersihkanNama(m.nama)
  return prisma.$transaction(async (tx) => {
    const periode = await tx.periode.findUnique({ where: { id: m.periodeId } })
    if (!periode) throw new GalatPengguna('Periode tidak ditemukan')
    await pastikanNamaBebas(tx, m.periodeId, nama)
    const akanTidakLengkap = await hitungDampak(tx, m.periodeId)
    let urutan = m.urutan
    if (urutan === undefined) {
      const maks = await tx.daftarDokumen.aggregate({ where: { periodeId: m.periodeId }, _max: { urutan: true } })
      urutan = (maks._max.urutan ?? 0) + 1
    }
    const dok = await tx.daftarDokumen.create({ data: { periodeId: m.periodeId, nama, urutan } })
    await catatRiwayat(
      { periodeId: m.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: `Menambah dokumen: ${nama}`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
    return { akanTidakLengkap }
  })
}

/** Ganti nama dan/atau urutan. Urutan menukar posisi dengan dokumen lain yang memegang urutan itu. */
export async function ubahDokumen(m: { dokumenId: string; nama?: string; urutan?: number; adminId: string }): Promise<void> {
  const nama = m.nama === undefined ? undefined : bersihkanNama(m.nama)
  if (m.urutan !== undefined && !Number.isInteger(m.urutan)) throw new GalatPengguna('Urutan tidak sah')
  await prisma.$transaction(async (tx) => {
    const dok = await ambilDokumen(tx, m.dokumenId)
    const catatan: string[] = []
    if (nama !== undefined && nama !== dok.nama) {
      if (dok.aktif) await pastikanNamaBebas(tx, dok.periodeId, nama, dok.id)
      await tx.daftarDokumen.update({ where: { id: dok.id }, data: { nama } })
      catatan.push(`Mengubah nama dokumen: ${dok.nama} menjadi ${nama}`)
    }
    if (m.urutan !== undefined && m.urutan !== dok.urutan) {
      const tetangga = await tx.daftarDokumen.findFirst({
        where: { periodeId: dok.periodeId, urutan: m.urutan, id: { not: dok.id } },
        orderBy: { id: 'asc' },
      })
      if (tetangga) await tx.daftarDokumen.update({ where: { id: tetangga.id }, data: { urutan: dok.urutan } })
      await tx.daftarDokumen.update({ where: { id: dok.id }, data: { urutan: m.urutan } })
      catatan.push(`Mengubah urutan dokumen: ${nama ?? dok.nama}`)
    }
    if (catatan.length === 0) return
    await catatRiwayat(
      { periodeId: dok.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: catatan.join('; '), oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
  })
}

/** Dokumen tidak pernah dihapus; hanya dinonaktifkan (baris guru tetap utuh). */
export async function nonaktifkanDokumen(m: { dokumenId: string; adminId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dok = await ambilDokumen(tx, m.dokumenId)
    if (!dok.aktif) throw new GalatPengguna('Dokumen ini sudah nonaktif')
    await tx.daftarDokumen.update({ where: { id: dok.id }, data: { aktif: false } })
    await catatRiwayat(
      { periodeId: dok.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: `Menonaktifkan dokumen: ${dok.nama}`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
  })
}

export async function aktifkanKembaliDokumen(m: { dokumenId: string; adminId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dok = await ambilDokumen(tx, m.dokumenId)
    if (dok.aktif) throw new GalatPengguna('Dokumen ini sudah aktif')
    await pastikanNamaBebas(tx, dok.periodeId, dok.nama)
    await tx.daftarDokumen.update({ where: { id: dok.id }, data: { aktif: true } })
    await catatRiwayat(
      { periodeId: dok.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: `Mengaktifkan kembali dokumen: ${dok.nama}`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
  })
}
