import { cache } from 'react'
import type { Periode } from '@prisma/client'
import { prisma } from '@/lib/db'
import { tutupPeriodeLewatTenggat } from '@/lib/tenggat'

const terbaruDulu = [{ dibuatPada: 'desc' as const }, { id: 'desc' as const }]

/** Bawaan: periode yang dibuka, kalau tidak ada periode terbaru. Lalu ?periode=<id> bila id ada di daftar. */
export function pilihPeriode<P extends Pick<Periode, 'id' | 'dibuka'>>(daftar: P[], diminta?: string | null): P | null {
  const dipilih = diminta ? daftar.find((p) => p.id === diminta) : undefined
  return dipilih ?? daftar.find((p) => p.dibuka) ?? daftar[0] ?? null
}

/** Semua periode, terbaru dulu (untuk admin). Dibagi dalam satu permintaan (layout dan halaman), tidak antar permintaan. */
// Penutupan karena tenggat dijalankan di sini (titik baca periode) supaya status selalu benar tanpa cron.
export const semuaPeriode = cache(async (): Promise<Periode[]> => {
  await tutupPeriodeLewatTenggat()
  return prisma.periode.findMany({ orderBy: terbaruDulu })
})

/**
 * Periode yang boleh dilihat seorang guru: yang punya minimal satu DokumenGuru miliknya,
 * ditambah periode saat ini (yang dibuka, atau periode terbaru bila tidak ada yang dibuka).
 */
export async function periodeTerlihatGuru(guruId: string): Promise<Periode[]> {
  await tutupPeriodeLewatTenggat()
  const kini = (await prisma.periode.findFirst({ where: { dibuka: true } })) ?? (await prisma.periode.findFirst({ orderBy: terbaruDulu }))
  return prisma.periode.findMany({
    where: { OR: [{ dokumenGuru: { some: { guruId } } }, ...(kini ? [{ id: kini.id }] : [])] },
    orderBy: terbaruDulu,
  })
}
