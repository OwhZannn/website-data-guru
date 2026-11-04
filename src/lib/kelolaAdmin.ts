import { prisma } from '@/lib/db'
import { GalatPengguna } from '@/lib/galat'
import { hashSandi } from '@/lib/sandi'
import { catatRiwayat } from '@/lib/riwayat'

export const bentukEmailWajar = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export async function tambahAdmin(masukan: { nama: string; email: string; sandi: string; olehAdminId: string }): Promise<{ id: string }> {
  const nama = masukan.nama.trim()
  const email = masukan.email.trim().toLowerCase()
  if (!nama) throw new GalatPengguna('Nama wajib diisi')
  if (!bentukEmailWajar(email)) throw new GalatPengguna('Email tidak valid')
  const hash = await hashSandi(masukan.sandi)
  const periode =
    (await prisma.periode.findFirst({ where: { dibuka: true } })) ??
    (await prisma.periode.findFirst({ orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }] }))
  try {
    return await prisma.$transaction(async (tx) => {
      const [a, g] = await Promise.all([
        tx.admin.findUnique({ where: { email } }),
        tx.guru.findUnique({ where: { email } }),
      ])
      if (a || g) throw new GalatPengguna('Email sudah dipakai')
      const baru = await tx.admin.create({ data: { nama, email, hashSandi: hash } })
      if (periode) {
        await catatRiwayat({ periodeId: periode.id, aksi: 'buat_admin', alasan: email, oleh: masukan.olehAdminId, olehTipe: 'admin' }, tx)
      }
      return { id: baru.id }
    })
  } catch (e) {
    if (typeof e === 'object' && e && (e as { code?: string }).code === 'P2002') throw new GalatPengguna('Email sudah dipakai')
    throw e
  }
}

export async function nonaktifkanAdmin(masukan: { adminId: string; olehAdminId: string }): Promise<void> {
  if (masukan.adminId === masukan.olehAdminId) throw new GalatPengguna('Anda tidak dapat menonaktifkan akun sendiri')
  await prisma.$transaction(async (tx) => {
    const a = await tx.admin.findUnique({ where: { id: masukan.adminId } })
    if (!a) throw new GalatPengguna('Admin tidak ditemukan')
    if (a.aktif) {
      const lain = await tx.admin.count({ where: { aktif: true, id: { not: masukan.adminId } } })
      if (lain === 0) throw new GalatPengguna('Admin aktif terakhir tidak dapat dinonaktifkan')
    }
    await tx.admin.update({ where: { id: masukan.adminId }, data: { aktif: false } })
    await tx.sesi.deleteMany({ where: { pemilikId: masukan.adminId, tipe: 'admin' } })
  })
}

export async function aktifkanAdmin(adminId: string): Promise<void> {
  const r = await prisma.admin.updateMany({ where: { id: adminId }, data: { aktif: true } })
  if (r.count === 0) throw new GalatPengguna('Admin tidak ditemukan')
}
