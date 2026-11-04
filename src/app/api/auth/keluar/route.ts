import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { hapusSesi } from '@/lib/sesi'

export async function POST() {
  const jar = await cookies()
  const token = jar.get('sesi')?.value
  if (token) await hapusSesi(token)
  jar.delete('sesi')
  return NextResponse.json({ ok: true })
}
