import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { Readable } from 'node:stream'
import { bacaSesi } from '@/lib/sesi'
import { prisma } from '@/lib/db'
import { unduhStreamDrive } from '@/lib/drive'
import { disposisiInline } from '@/lib/disposisi'

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

  // Hanya berkas yang tercatat sebagai dokumen guru yang boleh dialirkan, juga untuk admin:
  // akun Drive aplikasi juga menyimpan berkas lain (mis. cadangan basis data).
  const tercatat = await prisma.dokumenGuru.findFirst({
    where: { fileId, ...(sesi.tipe === 'guru' ? { guruId: sesi.pemilikId } : {}) },
    select: { id: true },
  })
  if (!tercatat) {
    return sesi.tipe === 'guru'
      ? new NextResponse('Tidak diizinkan', { status: 403 })
      : new NextResponse('Berkas tidak ditemukan', { status: 404 })
  }

  const berkas = await unduhStreamDrive(fileId)
  if (!berkas) {
    return new NextResponse('Berkas tidak ditemukan', { status: 404 })
  }

  const webStream = Readable.toWeb(berkas.stream) as unknown as ReadableStream
  return new Response(webStream, {
    headers: {
      'Content-Type': berkas.tipe || 'application/pdf',
      'Content-Disposition': disposisiInline(berkas.nama),
      'X-Content-Type-Options': 'nosniff',
      ...(berkas.ukuran ? { 'Content-Length': String(berkas.ukuran) } : {}),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
