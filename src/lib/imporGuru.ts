import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { hashSandi } from '@/lib/sandi'
import { catatRiwayat } from '@/lib/riwayat'

const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'.replace(/[Ol]/g, '')

export function acakSandiAwal(): string {
  let s = ''
  for (let i = 0; i < 10; i++) s += ALFABET[randomInt(ALFABET.length)]
  return s
}

export type BarisGuru = { nama: string; nip: string; email: string }

/** Satu guru per baris: `nama;nip;email` atau `nama,nip,email` (pemisah dideteksi per baris). */
export function uraiDaftarGuru(teks: string): BarisGuru[] {
  const hasil: BarisGuru[] = []
  for (const mentah of teks.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    if (!mentah.trim()) continue
    const bagian = mentah.split(mentah.includes(';') ? ';' : ',').map((x) => x.trim())
    if (bagian[0].toLowerCase() === 'nama') continue
    hasil.push({ nama: bagian[0] ?? '', nip: bagian[1] ?? '', email: bagian[2] ?? '' })
  }
  return hasil
}

const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UKURAN_BATCH = 25
export const MAKS_BARIS = 500

export type HasilImpor = {
  dibuat: number
  dilewati: number
  ditolak: { baris: number; alasan: string }[]
  sandiAwal: { nama: string; email: string; sandi: string }[]
}

export async function imporGuru(masukan: { baris: BarisGuru[]; adminId: string }): Promise<HasilImpor> {
  const { adminId } = masukan
  if (masukan.baris.length > MAKS_BARIS) throw new GalatPengguna(`Maksimal ${MAKS_BARIS} baris per impor. Bagi daftar menjadi beberapa bagian.`)
  const periode =
    (await prisma.periode.findFirst({ where: { dibuka: true } })) ??
    (await prisma.periode.findFirst({ orderBy: { dibuatPada: 'desc' } }))
  if (!periode) throw new GalatPengguna('Buat periode terlebih dahulu sebelum mengimpor guru')

  const ditolak: HasilImpor['ditolak'] = []
  const sah: (BarisGuru & { baris: number })[] = []
  const nipTerlihat = new Set<string>()
  const emailTerlihat = new Set<string>()
  masukan.baris.forEach((b, i) => {
    const nomor = i + 1
    const nama = b.nama.trim()
    const nipMentah = b.nip.trim()
    const email = b.email.trim().toLowerCase()
    if (!nama) return void ditolak.push({ baris: nomor, alasan: 'Nama kosong' })
    if (!nipMentah || !/^[0-9 ]+$/.test(nipMentah)) return void ditolak.push({ baris: nomor, alasan: 'NIP harus berupa angka' })
    const nip = nipMentah.replace(/ /g, '')
    if (!nip) return void ditolak.push({ baris: nomor, alasan: 'NIP harus berupa angka' })
    if (!POLA_EMAIL.test(email)) return void ditolak.push({ baris: nomor, alasan: 'Format email tidak valid' })
    if (nipTerlihat.has(nip) || emailTerlihat.has(email)) return void ditolak.push({ baris: nomor, alasan: 'NIP atau email ganda dalam daftar' })
    nipTerlihat.add(nip); emailTerlihat.add(email)
    sah.push({ nama, nip, email, baris: nomor })
  })

  const ada = await prisma.guru.findMany({
    where: { OR: [{ nip: { in: [...nipTerlihat] } }, { email: { in: [...emailTerlihat] } }] },
    select: { nip: true, email: true },
  })
  const nipAda = new Set(ada.map((g) => g.nip))
  const emailAda = new Set(ada.map((g) => g.email))
  const baru = sah.filter((b) => !nipAda.has(b.nip) && !emailAda.has(b.email))
  let dilewati = sah.length - baru.length

  const sandiAwal: HasilImpor['sandiAwal'] = []
  for (let i = 0; i < baru.length; i += UKURAN_BATCH) {
    const batch = await Promise.all(baru.slice(i, i + UKURAN_BATCH).map(async (b) => {
      const sandi = acakSandiAwal()
      return { b, sandi, hash: await hashSandi(sandi) }
    }))
    const catat = (x: (typeof batch)[number]) => sandiAwal.push({ nama: x.b.nama, email: x.b.email, sandi: x.sandi })
    const baris = (x: (typeof batch)[number]) => ({ nama: x.b.nama, nip: x.b.nip, email: x.b.email, hashSandi: x.hash })
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
        const ada = await prisma.guru.findFirst({ where: { OR: [{ nip: x.b.nip }, { email: x.b.email }] }, select: { id: true } }).catch(() => null)
        if (ada) dilewati += 1
        else {
          console.error('impor guru: baris gagal disimpan', e)
          ditolak.push({ baris: x.b.baris, alasan: 'Gagal disimpan, coba lagi' })
        }
      }
    }
  }
  ditolak.sort((a, b) => a.baris - b.baris)

  await catatRiwayat({
    periodeId: periode.id, aksi: 'impor_guru', oleh: adminId, olehTipe: 'admin',
    alasan: `Impor: ${sandiAwal.length} dibuat, ${dilewati} dilewati, ${ditolak.length} ditolak`,
  })
  return { dibuat: sandiAwal.length, dilewati, ditolak, sandiAwal }
}
