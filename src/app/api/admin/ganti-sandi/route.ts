import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { wajibAdmin } from '@/lib/auth'
import { gantiSandi } from '@/lib/gantiSandi'
import { bolehCobaMasuk, catatGagalMasuk, bersihkanGagalMasuk } from '@/lib/pembatas'

const skema = z.object({ sandiLama: z.string(), sandiBaru: z.string(), konfirmasi: z.string() })

const gagal = (pesan: string, status = 400) => NextResponse.json({ ok: false, pesan }, { status })

export async function POST(req: Request) {
  let admin
  try {
    admin = await wajibAdmin()
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal('Permintaan tidak sah')

  // Batasi tebakan sandi lama dari sesi yang mungkin dibajak.
  const kunci = `ganti-sandi:admin:${admin.id}`
  if (!(await bolehCobaMasuk(kunci))) return gagal('Terlalu banyak percobaan. Coba lagi dalam 15 menit.', 429)

  const hasil = await gantiSandi({
    tipe: 'admin',
    pemilik: admin,
    ...body.data,
    tokenSekarang: (await cookies()).get('sesi')?.value,
  })
  if (!hasil.ok) {
    if (hasil.sandiLamaSalah) await catatGagalMasuk(kunci)
    return gagal(hasil.pesan)
  }
  await bersihkanGagalMasuk(kunci)
  return NextResponse.json({ ok: true })
}
