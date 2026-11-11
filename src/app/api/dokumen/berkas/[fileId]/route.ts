import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { Readable } from 'node:stream'
import { bacaSesi } from '@/lib/sesi'
import { prisma } from '@/lib/db'
import { unduhStreamDrive } from '@/lib/drive'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  if (!fileId) {
    return new NextResponse('File ID tidak valid', { status: 400 })
  }

  const token = (await cookies()).get('sesi')?.value
  const sesi = token ? await bacaSesi(token) : null
  if (!sesi) {
    return new NextResponse('Tidak diizinkan', { status: 401 })
  }

  if (sesi.tipe === 'guru') {
    const milik = await prisma.dokumenGuru.findFirst({
      where: { fileId, guruId: sesi.pemilikId },
      select: { id: true },
    })
    if (!milik) {
      return new NextResponse('Tidak diizinkan', { status: 403 })
    }
  }

  const berkas = await unduhStreamDrive(fileId)
  if (!berkas) {
    return new NextResponse('Berkas tidak ditemukan', { status: 404 })
  }

  const webStream = Readable.toWeb(berkas.stream)
  return new Response(webStream as any, {
    headers: {
      'Content-Type': berkas.tipe || 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(berkas.nama)}"`,
      ...(berkas.ukuran ? { 'Content-Length': String(berkas.ukuran) } : {}),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
