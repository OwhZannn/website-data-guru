import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { wajibGuru } from '@/lib/auth'
import { gantiSandi } from '@/lib/gantiSandi'

const skema = z.object({ sandiLama: z.string(), sandiBaru: z.string(), konfirmasi: z.string() })

const gagal = (pesan: string, status = 400) => NextResponse.json({ ok: false, pesan }, { status })

export async function POST(req: Request) {
  let guru
  try {
    guru = await wajibGuru()
  } catch (e) {
    if (e instanceof Response) return e
    throw e
  }
  const body = skema.safeParse(await req.json().catch(() => null))
  if (!body.success) return gagal('Permintaan tidak sah')

  const hasil = await gantiSandi({
    tipe: 'guru',
    pemilik: guru,
    ...body.data,
    tokenSekarang: (await cookies()).get('sesi')?.value,
  })
  if (!hasil.ok) return gagal(hasil.pesan)
  return NextResponse.json({ ok: true })
}
