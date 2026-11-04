import type { Periode } from '@prisma/client'
import { prisma } from '@/lib/db'

const terbaruDulu = [{ dibuatPada: 'desc' as const }, { id: 'desc' as const }]

/** Bawaan: periode yang dibuka, kalau tidak ada periode terbaru. Lalu ?periode=<id> bila id ada di daftar. */
export function pilihPeriode<P extends Pick<Periode, 'id' | 'dibuka'>>(daftar: P[], diminta?: string | null): P | null {
  const dipilih = diminta ? daftar.find((p) => p.id === diminta) : undefined
  return dipilih ?? daftar.find((p) => p.dibuka) ?? daftar[0] ?? null
}

/** Semua periode, terbaru dulu (untuk admin). */
export function semuaPeriode(): Promise<Periode[]> {
  return prisma.periode.findMany({ orderBy: terbaruDulu })
}

/**
 * Periode yang boleh dilihat seorang guru: yang punya minimal satu DokumenGuru miliknya,
 * ditambah periode saat ini (yang dibuka, atau periode terbaru bila tidak ada yang dibuka).
 */
export async function periodeTerlihatGuru(guruId: string): Promise<Periode[]> {
  const kini = (await prisma.periode.findFirst({ where: { dibuka: true } })) ?? (await prisma.periode.findFirst({ orderBy: terbaruDulu }))
  return prisma.periode.findMany({
    where: { OR: [{ dokumenGuru: { some: { guruId } } }, ...(kini ? [{ id: kini.id }] : [])] },
    orderBy: terbaruDulu,
  })
}
