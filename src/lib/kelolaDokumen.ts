import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { catatRiwayat } from '@/lib/riwayat'
import { hitungStatusGuru } from '@/lib/status'
import { GalatPengguna } from '@/lib/galat'
import { KODE_BERLAKU, LABEL_BERLAKU, wajibBagi } from '@/lib/syarat'

export const NAMA_MAKS = 200

function bersihkanBerlaku(b: unknown): string {
  const v = b ?? 'semua'
  if (typeof v !== 'string' || !(KODE_BERLAKU as readonly string[]).includes(v)) throw new GalatPengguna('Pilihan "Berlaku untuk" tidak sah')
  return v
}

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

async function ambilDokumen(tx: Prisma.TransactionClient, dokumenId: string, periodeId: string) {
  const dok = await tx.daftarDokumen.findUnique({ where: { id: dokumenId } })
  if (!dok || dok.periodeId !== periodeId) throw new GalatPengguna('Dokumen tidak ditemukan')
  return dok
}

/**
 * Berapa guru yang kini lengkap tetapi akan kembali tidak lengkap bila satu dokumen aktif
 * ditambahkan. Bila `dokumenId` (dokumen nonaktif yang diaktifkan kembali) diberikan, guru yang
 * sudah berstatus SAH pada dokumen itu tidak dihitung.
 */
async function hitungDampak(tx: Prisma.TransactionClient, periodeId: string, dokumenId?: string, berlaku = 'semua'): Promise<number> {
  const dokumen = await tx.daftarDokumen.findMany({ where: { periodeId, aktif: true }, select: { id: true, aktif: true, berlakuUntuk: true } })
  if (dokumen.length === 0) return 0
  const baris = await tx.dokumenGuru.findMany({
    where: { periodeId, guru: { aktif: true } },
    select: { guruId: true, dokumenId: true, status: true },
  })
  const perGuru = new Map<string, typeof baris>()
  for (const b of baris) perGuru.set(b.guruId, [...(perGuru.get(b.guruId) ?? []), b])
  const profil = new Map((await tx.guru.findMany({ where: { id: { in: [...perGuru.keys()] } } })).map((g) => [g.id, g]))
  let jumlah = 0
  for (const [guruId, rows] of perGuru) {
    const p = profil.get(guruId)
    if (!p || !wajibBagi(berlaku, p)) continue
    if (!hitungStatusGuru(dokumen, rows, p).lengkap) continue
    if (dokumenId && rows.some((r) => r.dokumenId === dokumenId && r.status === 'SAH')) continue
    jumlah++
  }
  return jumlah
}

export function hitungDampakDokumenBaru(periodeId: string, dokumenId?: string, berlaku?: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    if (dokumenId) {
      const dok = await ambilDokumen(tx, dokumenId, periodeId)
      return hitungDampak(tx, periodeId, dokumenId, dok.berlakuUntuk)
    }
    return hitungDampak(tx, periodeId, undefined, bersihkanBerlaku(berlaku))
  })
}

export async function tambahDokumen(m: {
  periodeId: string
  nama: string
  urutan?: number
  berlakuUntuk?: string
  adminId: string
}): Promise<{ akanTidakLengkap: number }> {
  const nama = bersihkanNama(m.nama)
  const berlakuUntuk = bersihkanBerlaku(m.berlakuUntuk)
  return prisma.$transaction(async (tx) => {
    const periode = await tx.periode.findUnique({ where: { id: m.periodeId } })
    if (!periode) throw new GalatPengguna('Periode tidak ditemukan')
    await pastikanNamaBebas(tx, m.periodeId, nama)
    const akanTidakLengkap = await hitungDampak(tx, m.periodeId, undefined, berlakuUntuk)
    let urutan = m.urutan
    if (urutan === undefined) {
      const maks = await tx.daftarDokumen.aggregate({ where: { periodeId: m.periodeId }, _max: { urutan: true } })
      urutan = (maks._max.urutan ?? 0) + 1
    }
    const dok = await tx.daftarDokumen.create({ data: { periodeId: m.periodeId, nama, urutan, berlakuUntuk } })
    await catatRiwayat(
      { periodeId: m.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: `Menambah dokumen: ${nama}${berlakuUntuk === 'semua' ? '' : ` (khusus ${LABEL_BERLAKU[berlakuUntuk]})`}`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
    return { akanTidakLengkap }
  })
}

/** Ganti nama dan/atau geser satu posisi. Penukaran hanya dengan dokumen AKTIF bertetangga di periode yang sama. */
export async function ubahDokumen(m: {
  dokumenId: string
  periodeId: string
  nama?: string
  arah?: 'naik' | 'turun'
  berlakuUntuk?: string
  adminId: string
}): Promise<void> {
  const nama = m.nama === undefined ? undefined : bersihkanNama(m.nama)
  const berlakuUntuk = m.berlakuUntuk === undefined ? undefined : bersihkanBerlaku(m.berlakuUntuk)
  if (m.arah !== undefined && m.arah !== 'naik' && m.arah !== 'turun') throw new GalatPengguna('Arah tidak sah')
  await prisma.$transaction(async (tx) => {
    const dok = await ambilDokumen(tx, m.dokumenId, m.periodeId)
    const catatan: string[] = []
    if (nama !== undefined && nama !== dok.nama) {
      if (dok.aktif) await pastikanNamaBebas(tx, dok.periodeId, nama, dok.id)
      await tx.daftarDokumen.update({ where: { id: dok.id }, data: { nama } })
      catatan.push(`Mengubah nama dokumen: ${dok.nama} menjadi ${nama}`)
    }
    if (berlakuUntuk !== undefined && berlakuUntuk !== dok.berlakuUntuk) {
      await tx.daftarDokumen.update({ where: { id: dok.id }, data: { berlakuUntuk } })
      catatan.push(`Mengubah "berlaku untuk" ${nama ?? dok.nama}: ${LABEL_BERLAKU[dok.berlakuUntuk] ?? dok.berlakuUntuk} menjadi ${LABEL_BERLAKU[berlakuUntuk]}`)
    }
    if (m.arah) {
      if (!dok.aktif) throw new GalatPengguna('Dokumen nonaktif tidak bisa diurutkan')
      const aktif = await tx.daftarDokumen.findMany({
        where: { periodeId: dok.periodeId, aktif: true },
        orderBy: [{ urutan: 'asc' }, { id: 'asc' }],
      })
      const i = aktif.findIndex((d) => d.id === dok.id)
      const tetangga = aktif[m.arah === 'naik' ? i - 1 : i + 1]
      if (!tetangga) {
        throw new GalatPengguna(m.arah === 'naik' ? 'Dokumen sudah di posisi paling atas' : 'Dokumen sudah di posisi paling bawah')
      }
      // Tukar posisi, lalu beri urutan 1..n pada dokumen aktif (menormalkan celah dan urutan kembar).
      const baru = [...aktif]
      ;[baru[i], baru[aktif.indexOf(tetangga)]] = [baru[aktif.indexOf(tetangga)], baru[i]]
      for (const [k, d] of baru.entries()) {
        if (d.urutan !== k + 1) await tx.daftarDokumen.update({ where: { id: d.id }, data: { urutan: k + 1 } })
      }
      catatan.push(`Menggeser ${m.arah === 'naik' ? 'ke atas' : 'ke bawah'}: ${nama ?? dok.nama}`)
    }
    if (catatan.length === 0) return
    await catatRiwayat(
      { periodeId: dok.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: catatan.join('; '), oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
  })
}

/** Dokumen tidak pernah dihapus; hanya dinonaktifkan (baris guru tetap utuh). */
export async function nonaktifkanDokumen(m: { dokumenId: string; periodeId: string; adminId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dok = await ambilDokumen(tx, m.dokumenId, m.periodeId)
    if (!dok.aktif) throw new GalatPengguna('Dokumen ini sudah nonaktif')
    await tx.daftarDokumen.update({ where: { id: dok.id }, data: { aktif: false } })
    await catatRiwayat(
      { periodeId: dok.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: `Menonaktifkan dokumen: ${dok.nama}`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
  })
}

export async function aktifkanKembaliDokumen(m: { dokumenId: string; periodeId: string; adminId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const dok = await ambilDokumen(tx, m.dokumenId, m.periodeId)
    if (dok.aktif) throw new GalatPengguna('Dokumen ini sudah aktif')
    await pastikanNamaBebas(tx, dok.periodeId, dok.nama)
    await tx.daftarDokumen.update({ where: { id: dok.id }, data: { aktif: true } })
    await catatRiwayat(
      { periodeId: dok.periodeId, dokumenId: dok.id, aksi: 'ubah_daftar_dokumen', alasan: `Mengaktifkan kembali dokumen: ${dok.nama}`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
  })
}

/** Daftar dokumen baku verval sertifikasi guru PAI. */
export const DAFTAR_BAKU: { nama: string; berlakuUntuk: string }[] = [
  { nama: 'Jadwal dan tugas guru PAI dari sekolah', berlakuUntuk: 'guru' },
  { nama: 'Jadwal dan tugas dari aplikasi SIAGA (distempel dan ditandatangani kepala sekolah)', berlakuUntuk: 'guru' },
  { nama: 'Absen dari sekolah', berlakuUntuk: 'guru' },
  { nama: 'SK sebagai kepala sekolah', berlakuUntuk: 'kepsek' },
  { nama: 'Program kepala sekolah', berlakuUntuk: 'kepsek' },
  { nama: 'Absen dari aplikasi SIAGA', berlakuUntuk: 'kepsek' },
  { nama: 'SK kenaikan gaji berkala terakhir', berlakuUntuk: 'semua' },
  { nama: 'SK kenaikan pangkat terakhir', berlakuUntuk: 'pns' },
  { nama: 'Laporan kepala lab/perpustakaan', berlakuUntuk: 'lab_perpus' },
  { nama: 'Sertifikat kepala perpustakaan/lab', berlakuUntuk: 'lab_perpus' },
  { nama: 'Laporan TBQ', berlakuUntuk: 'tbq' },
  { nama: 'Laporan bimbingan Rohis', berlakuUntuk: 'rohis' },
  { nama: 'Bukti pembinaan Imtaq/ekskul', berlakuUntuk: 'imtaq' },
  { nama: 'Bukti bimbingan inklusi', berlakuUntuk: 'inklusi' },
  { nama: 'Sertifikat pembimbing inklusi', berlakuUntuk: 'inklusi' },
  { nama: 'Laporan wakil kepala sekolah', berlakuUntuk: 'wakasek' },
  { nama: 'Laporan pembina OSIS', berlakuUntuk: 'osis' },
  { nama: 'Laporan wali kelas', berlakuUntuk: 'wali_kelas' },
  { nama: 'Laporan guru piket', berlakuUntuk: 'piket' },
  { nama: 'Laporan guru wali', berlakuUntuk: 'guru_wali' },
  { nama: 'Buku rekening', berlakuUntuk: 'sertifikasi_baru' },
  { nama: 'NUPTK / NPWP / KTP', berlakuUntuk: 'sertifikasi_baru' },
  { nama: 'Ijazah terakhir (asli atau legalisir)', berlakuUntuk: 'sertifikasi_baru' },
  { nama: 'Sertifikat pendidik (asli atau legalisir)', berlakuUntuk: 'sertifikasi_baru' },
]

/** Isi periode yang daftar dokumennya masih kosong (termasuk yang nonaktif) dengan daftar baku. */
export async function isiDaftarBaku(m: { periodeId: string; adminId: string }): Promise<{ jumlah: number }> {
  return prisma.$transaction(async (tx) => {
    const periode = await tx.periode.findUnique({ where: { id: m.periodeId } })
    if (!periode) throw new GalatPengguna('Periode tidak ditemukan')
    if (await tx.daftarDokumen.count({ where: { periodeId: m.periodeId } })) {
      throw new GalatPengguna('Daftar baku hanya bisa dipakai pada periode yang belum punya dokumen')
    }
    await tx.daftarDokumen.createMany({
      data: DAFTAR_BAKU.map((d, i) => ({ periodeId: m.periodeId, nama: d.nama, berlakuUntuk: d.berlakuUntuk, urutan: i + 1 })),
    })
    await catatRiwayat(
      { periodeId: m.periodeId, aksi: 'ubah_daftar_dokumen', alasan: `Mengisi daftar baku (${DAFTAR_BAKU.length} dokumen)`, oleh: m.adminId, olehTipe: 'admin' },
      tx,
    )
    return { jumlah: DAFTAR_BAKU.length }
  })
}
