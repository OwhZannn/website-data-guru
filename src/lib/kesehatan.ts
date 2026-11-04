import { prisma } from '@/lib/db'
import { periksaDrive } from '@/lib/drive'
import { terjemahkanGalatDrive } from '@/lib/galatDrive'

export type StatusDrive = { drive: 'ok' } | { drive: 'gagal'; pesan: string }

let simpan: { at: number; nilai: StatusDrive } | null = null

export async function statusDrive(): Promise<StatusDrive> {
  try {
    await periksaDrive()
    return { drive: 'ok' }
  } catch (e) {
    console.error('pemeriksaan Drive gagal', e)
    return { drive: 'gagal', pesan: terjemahkanGalatDrive(e).pesan }
  }
}

/** Untuk banner admin: hasil disimpan di memori selama 60 detik. */
export async function statusDriveTersimpan(): Promise<StatusDrive> {
  if (simpan && Date.now() - simpan.at < 60_000) return simpan.nilai
  const nilai = await statusDrive()
  simpan = { at: Date.now(), nilai }
  return nilai
}

export async function statusBasisData(): Promise<'ok' | 'gagal'> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return 'ok'
  } catch {
    return 'gagal'
  }
}
