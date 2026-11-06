import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { hashSandi } from '@/lib/sandi'
import { acakSandiAngka, bacaGuruBaru } from '@/lib/identitas'
import { catatRiwayat, type AksiRiwayat } from '@/lib/riwayat'

/** Catat di periode yang dibuka (atau terbaru); tanpa periode, tidak dicatat. Tidak pernah menggagalkan aksi. */
async function catatDiPeriode(m: { guruId: string; aksi: AksiRiwayat; alasan: string; oleh: string; olehTipe: 'guru' | 'admin' }) {
  try {
    const periode =
      (await prisma.periode.findFirst({ where: { dibuka: true } })) ??
      (await prisma.periode.findFirst({ orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }] }))
    if (periode) await catatRiwayat({ periodeId: periode.id, ...m })
  } catch (e) {
    console.error('kelola guru: gagal mencatat riwayat', e)
  }
}

/**
 * Buat akun guru. `disetujui: false` untuk pendaftaran mandiri: akun belum bisa dipakai masuk
 * sampai admin menyetujuinya. Sandi awal (8 angka) dikembalikan sekali saja.
 */
export async function buatAkunGuru(m: { data: unknown; disetujui: boolean; oleh?: string }) {
  const d = bacaGuruBaru((m.data ?? {}) as Record<string, unknown>)
  const kunci = [d.username, d.nip, d.nik].filter((k): k is string => !!k)
  const ada = await prisma.guru.findFirst({ where: { OR: kunci.flatMap((k) => [{ username: k }, { nip: k }, { nik: k }]) } })
  if (ada) {
    const bentrokNip = !!d.nip && [ada.username, ada.nip, ada.nik].includes(d.nip)
    throw new GalatPengguna(`${bentrokNip ? 'NIP' : 'NIK'} ini sudah terdaftar. Hubungi admin bila Anda lupa sandi.`)
  }
  const sandi = acakSandiAngka()
  let guru
  try {
    guru = await prisma.guru.create({ data: { ...d, hashSandi: await hashSandi(sandi), disetujui: m.disetujui } })
  } catch (e) {
    // Dua pendaftaran bersamaan dengan NIP/NIK yang sama: yang kalah mendapat P2002.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new GalatPengguna('NIP atau NIK ini sudah terdaftar. Hubungi admin bila Anda lupa sandi.')
    }
    throw e
  }
  await catatDiPeriode({
    guruId: guru.id, aksi: m.disetujui ? 'tambah_guru' : 'daftar_guru',
    alasan: m.disetujui ? `Menambah guru ${d.nama}` : `${d.nama} mendaftar sendiri, menunggu persetujuan`,
    oleh: m.oleh ?? guru.id, olehTipe: m.disetujui ? 'admin' : 'guru',
  })
  return { id: guru.id, nama: guru.nama, username: guru.username, jenis: d.nip && guru.username === d.nip ? 'NIP' : 'NIK', sandi }
}

/** Setujui pendaftaran mandiri. */
export async function setujuiGuru(guruId: string, adminId: string): Promise<void> {
  const g = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!g) throw new GalatPengguna('Guru tidak ditemukan')
  if (g.disetujui) return
  await prisma.guru.update({ where: { id: guruId }, data: { disetujui: true } })
  await catatDiPeriode({ guruId, aksi: 'setujui_guru', alasan: `Menyetujui pendaftaran ${g.nama}`, oleh: adminId, olehTipe: 'admin' })
}

/** Tolak pendaftaran mandiri: akun yang belum disetujui (dan karenanya belum pernah mengunggah) dihapus. */
export async function tolakPendaftaran(guruId: string, adminId: string): Promise<void> {
  const g = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!g) throw new GalatPengguna('Guru tidak ditemukan')
  if (g.disetujui) throw new GalatPengguna('Guru ini sudah disetujui. Gunakan Nonaktifkan.')
  await prisma.$transaction(async (tx) => {
    await tx.sesi.deleteMany({ where: { pemilikId: guruId, tipe: 'guru' } })
    await tx.guru.delete({ where: { id: guruId } })
  })
  await catatDiPeriode({ guruId, aksi: 'tolak_daftar', alasan: `Menolak pendaftaran ${g.nama} (${g.username})`, oleh: adminId, olehTipe: 'admin' })
}

/** Aktif/nonaktif; menonaktifkan juga menghapus semua sesi guru itu. Guru tidak pernah dihapus. */
export async function aturAktifGuru(guruId: string, aktif: boolean): Promise<void> {
  const g = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!g) throw new GalatPengguna('Guru tidak ditemukan')
  await prisma.$transaction(async (tx) => {
    await tx.guru.update({ where: { id: guruId }, data: { aktif } })
    if (!aktif) await tx.sesi.deleteMany({ where: { pemilikId: guruId, tipe: 'guru' } })
  })
}

/** Sandi baru (8 angka acak) dikembalikan sekali saja; sesi lama guru dihapus. */
export async function aturUlangSandiGuru(guruId: string): Promise<{ sandi: string; username: string }> {
  const g = await prisma.guru.findUnique({ where: { id: guruId } })
  if (!g) throw new GalatPengguna('Guru tidak ditemukan')
  const sandi = acakSandiAngka()
  const hash = await hashSandi(sandi)
  await prisma.$transaction(async (tx) => {
    await tx.guru.update({ where: { id: guruId }, data: { hashSandi: hash } })
    await tx.sesi.deleteMany({ where: { pemilikId: guruId, tipe: 'guru' } })
  })
  return { sandi, username: g.username }
}
