import { redirect } from 'next/navigation'
import type { Admin, Guru } from '@prisma/client'
import { wajibAdmin, wajibGuru } from '@/lib/auth'

async function coba<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f()
  } catch {
    return null
  }
}

/** Untuk halaman guru: admin dialihkan ke /admin, tanpa sesi ke /masuk. */
export async function halamanGuru(): Promise<Guru> {
  const guru = await coba(wajibGuru)
  if (guru) return guru
  redirect((await coba(wajibAdmin)) ? '/admin' : '/masuk')
}

/** Untuk halaman admin: guru dialihkan ke /dokumen, tanpa sesi ke /masuk. */
export async function halamanAdmin(): Promise<Admin> {
  const admin = await coba(wajibAdmin)
  if (admin) return admin
  redirect((await coba(wajibGuru)) ? '/dokumen' : '/masuk')
}
