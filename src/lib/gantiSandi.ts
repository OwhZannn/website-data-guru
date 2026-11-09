import { prisma } from '@/lib/db'
import { hashSandi, periksaSandi } from '@/lib/sandi'
import type { TipeSesi } from '@/lib/sesi'

export type HasilGantiSandi =
  | { ok: true }
  | { ok: false; pesan: string; sandiLamaSalah?: boolean }

/**
 * Mengganti kata sandi guru atau admin: memeriksa sandi lama, panjang, dan konfirmasi, lalu
 * menyimpan hash baru dan menghapus sesi lain milik pemilik yang sama dalam satu transaksi.
 * Sesi yang sedang dipakai (`tokenSekarang`) dipertahankan.
 */
export async function gantiSandi(p: {
  tipe: TipeSesi
  pemilik: { id: string; hashSandi: string }
  sandiLama: string
  sandiBaru: string
  konfirmasi: string
  tokenSekarang?: string
}): Promise<HasilGantiSandi> {
  const { tipe, pemilik, sandiLama, sandiBaru, konfirmasi, tokenSekarang } = p
  if (!(await periksaSandi(sandiLama, pemilik.hashSandi))) {
    return { ok: false, pesan: 'Kata sandi lama salah', sandiLamaSalah: true }
  }
  if (sandiBaru.length < 8) return { ok: false, pesan: 'Kata sandi baru minimal 8 karakter' }
  if (sandiBaru !== konfirmasi) return { ok: false, pesan: 'Konfirmasi kata sandi tidak cocok' }

  const hash = await hashSandi(sandiBaru)
  const hapusSesiLain = prisma.sesi.deleteMany({
    where: { pemilikId: pemilik.id, tipe, ...(tokenSekarang ? { token: { not: tokenSekarang } } : {}) },
  })
  await prisma.$transaction([
    tipe === 'admin'
      ? prisma.admin.update({ where: { id: pemilik.id }, data: { hashSandi: hash } })
      : prisma.guru.update({ where: { id: pemilik.id }, data: { hashSandi: hash } }),
    hapusSesiLain,
  ])
  return { ok: true }
}
