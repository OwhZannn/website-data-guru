import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { hashSandi } from '@/lib/sandi'
import { catatRiwayat } from '@/lib/riwayat'
import { acakSandiAngka, bacaGuruBaru, type DataGuruBaru } from '@/lib/identitas'

const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'.replace(/[Ol]/g, '')

export function acakSandiAwal(): string {
  let s = ''
  for (let i = 0; i < 10; i++) s += ALFABET[randomInt(ALFABET.length)]
  return s
}

export type BarisGuru = { nama: string; nip: string; nik: string; status: string; tahun: string }

/**
 * Satu guru per baris: `nama;nip;nik;status kepegawaian;tahun sertifikasi` (pemisah `;` atau `,`,
 * dideteksi per baris). NIP boleh kosong untuk Non ASN, NIK boleh kosong untuk ASN.
 */
export function uraiDaftarGuru(teks: string): BarisGuru[] {
  const hasil: BarisGuru[] = []
  for (const mentah of teks.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/)) {
    if (!mentah.trim()) continue
    const b = mentah.split(mentah.includes(';') ? ';' : ',').map((x) => x.trim())
    if (b[0].toLowerCase() === 'nama') continue
    hasil.push({ nama: b[0] ?? '', nip: b[1] ?? '', nik: b[2] ?? '', status: b[3] ?? '', tahun: b[4] ?? '' })
  }
  return hasil
}

const UKURAN_BATCH = 25
export const MAKS_BARIS = 500

export type HasilImpor = {
  dibuat: number
  dilewati: number
  ditolak: { baris: number; alasan: string }[]
  sandiAwal: { nama: string; username: string; sandi: string }[]
}

export async function imporGuru(masukan: { baris: BarisGuru[]; adminId: string }): Promise<HasilImpor> {
  const { adminId } = masukan
  if (masukan.baris.length > MAKS_BARIS) throw new GalatPengguna(`Maksimal ${MAKS_BARIS} baris per impor. Bagi daftar menjadi beberapa bagian.`)
  const periode =
    (await prisma.periode.findFirst({ where: { dibuka: true } })) ??
    (await prisma.periode.findFirst({ orderBy: { dibuatPada: 'desc' } }))
  if (!periode) throw new GalatPengguna('Buat periode terlebih dahulu sebelum mengimpor guru')

  const ditolak: HasilImpor['ditolak'] = []
  const sah: (DataGuruBaru & { baris: number })[] = []
  const terlihat = new Set<string>()
  masukan.baris.forEach((b, i) => {
    const nomor = i + 1
    let d: DataGuruBaru
    try {
      d = bacaGuruBaru({ nama: b.nama, nip: b.nip, nik: b.nik, statusPegawai: b.status, tahunSertifikasi: b.tahun })
    } catch (e) {
      return void ditolak.push({ baris: nomor, alasan: e instanceof GalatPengguna ? e.message : 'Baris tidak sah' })
    }
    const kunci = [d.username, d.nip, d.nik].filter((x): x is string => !!x)
    if (kunci.some((k) => terlihat.has(k))) return void ditolak.push({ baris: nomor, alasan: 'NIP atau NIK ganda dalam daftar' })
    kunci.forEach((k) => terlihat.add(k))
    sah.push({ ...d, baris: nomor })
  })

  // Guru yang NIP, NIK, atau username-nya sudah terdaftar dilewati (impor ulang aman).
  const daftar = [...terlihat]
  const ada = await prisma.guru.findMany({
    where: { OR: [{ username: { in: daftar } }, { nip: { in: daftar } }, { nik: { in: daftar } }] },
    select: { username: true, nip: true, nik: true },
  })
  const sudah = new Set(ada.flatMap((g) => [g.username, g.nip, g.nik]).filter((x): x is string => !!x))
  const baru = sah.filter((b) => ![b.username, b.nip, b.nik].some((k) => k && sudah.has(k)))
  let dilewati = sah.length - baru.length

  const sandiAwal: HasilImpor['sandiAwal'] = []
  for (let i = 0; i < baru.length; i += UKURAN_BATCH) {
    const batch = await Promise.all(baru.slice(i, i + UKURAN_BATCH).map(async (b) => {
      const sandi = acakSandiAngka()
      return { b, sandi, hash: await hashSandi(sandi) }
    }))
    const catat = (x: (typeof batch)[number]) => sandiAwal.push({ nama: x.b.nama, username: x.b.username, sandi: x.sandi })
    const baris = (x: (typeof batch)[number]) => {
      const { baris: _nomor, ...data } = x.b
      return { ...data, hashSandi: x.hash }
    }
    try {
      await prisma.guru.createMany({ data: batch.map(baris) })
      batch.forEach(catat)
      continue
    } catch {
      // Batch gagal utuh (dibatalkan); periksa baris satu per satu agar impor tidak berhenti.
    }
    for (const x of batch) {
      try {
        await prisma.guru.create({ data: baris(x) })
        catat(x)
      } catch (e) {
        const kunci = [x.b.username, x.b.nip, x.b.nik].filter((k): k is string => !!k)
        const sudahAda = await prisma.guru.findFirst({
          where: { OR: kunci.flatMap((k) => [{ username: k }, { nip: k }, { nik: k }]) }, select: { id: true },
        }).catch(() => null)
        if (sudahAda) dilewati += 1
        else {
          console.error('impor guru: baris gagal disimpan', e)
          ditolak.push({ baris: x.b.baris, alasan: 'Gagal disimpan, coba lagi' })
        }
      }
    }
  }
  ditolak.sort((a, b) => a.baris - b.baris)

  try {
    await catatRiwayat({
      periodeId: periode.id, aksi: 'impor_guru', oleh: adminId, olehTipe: 'admin',
      alasan: `Impor: ${sandiAwal.length} dibuat, ${dilewati} dilewati, ${ditolak.length} ditolak`,
    })
  } catch (e) {
    // Akun sudah dibuat; jangan sampai sandi hilang hanya karena riwayat gagal ditulis.
    console.error('impor guru: gagal mencatat riwayat', e)
  }
  return { dibuat: sandiAwal.length, dilewati, ditolak, sandiAwal }
}
