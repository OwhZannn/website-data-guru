import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../../src/lib/db'
import { tambahAdmin, nonaktifkanAdmin, aktifkanAdmin } from '../../src/lib/kelolaAdmin'
import { bersihkanSemua } from '../bantu-db'

const mk = (email: string, aktif = true) => prisma.admin.create({ data: { nama: email, email, hashSandi: 'x', aktif } })

beforeEach(bersihkanSemua)

describe('tambahAdmin', () => {
  it('menormalkan email, mencatat riwayat bila ada periode', async () => {
    const o = await mk('o@x.id')
    const p = await prisma.periode.create({ data: { nama: 'P' } })
    const { id } = await tambahAdmin({ nama: ' Baru ', email: '  Baru@X.ID ', sandi: 'abcdefgh1234', olehAdminId: o.id })
    expect(await prisma.admin.findUnique({ where: { id } })).toMatchObject({ email: 'baru@x.id', nama: 'Baru' })
    expect(await prisma.riwayat.findFirst({ where: { aksi: 'buat_admin' } })).toMatchObject({ periodeId: p.id, oleh: o.id })
  })
  it('tanpa periode tidak melempar', async () => {
    const o = await mk('o@x.id')
    await expect(tambahAdmin({ nama: 'B', email: 'b@x.id', sandi: 'abcdefgh1234', olehAdminId: o.id })).resolves.toBeTruthy()
    expect(await prisma.riwayat.count()).toBe(0)
  })
  it('menolak email ganda di tabel admin maupun guru, dan email tak valid', async () => {
    const o = await mk('o@x.id')
    await prisma.guru.create({ data: { nama: 'G', nip: '1', email: 'g@x.id', hashSandi: 'x' } })
    const t = (email: string) => tambahAdmin({ nama: 'B', email, sandi: 'abcdefgh1234', olehAdminId: o.id })
    await expect(t('O@x.id')).rejects.toThrow('Email sudah dipakai')
    await expect(t('g@x.id')).rejects.toThrow('Email sudah dipakai')
    await expect(t('bukan-email')).rejects.toThrow('Email tidak valid')
  })
})

describe('nonaktifkanAdmin', () => {
  it('menonaktifkan dan menghapus sesi, bisa diaktifkan lagi', async () => {
    const a = await mk('a@x.id'); const b = await mk('b@x.id')
    await prisma.sesi.create({ data: { token: 't', pemilikId: b.id, tipe: 'admin', kedaluwarsa: new Date(Date.now() + 1e6) } })
    await nonaktifkanAdmin({ adminId: b.id, olehAdminId: a.id })
    expect((await prisma.admin.findUnique({ where: { id: b.id } }))!.aktif).toBe(false)
    expect(await prisma.sesi.count()).toBe(0)
    await aktifkanAdmin(b.id)
    expect((await prisma.admin.findUnique({ where: { id: b.id } }))!.aktif).toBe(true)
  })
  it('menolak menonaktifkan diri sendiri', async () => {
    const a = await mk('a@x.id'); await mk('b@x.id')
    await expect(nonaktifkanAdmin({ adminId: a.id, olehAdminId: a.id })).rejects.toThrow('Anda tidak dapat menonaktifkan akun sendiri')
  })
  it('menolak menonaktifkan admin aktif terakhir', async () => {
    const a = await mk('a@x.id'); const b = await mk('b@x.id', false)
    await expect(nonaktifkanAdmin({ adminId: a.id, olehAdminId: b.id })).rejects.toThrow('Admin aktif terakhir tidak dapat dinonaktifkan')
  })
  it('dua admin saling menonaktifkan bersamaan: satu berhasil, satu ditolak, satu tetap aktif', async () => {
    const a = await mk('a@x.id'); const b = await mk('b@x.id')
    const h = await Promise.allSettled([
      nonaktifkanAdmin({ adminId: b.id, olehAdminId: a.id }),
      nonaktifkanAdmin({ adminId: a.id, olehAdminId: b.id }),
    ])
    expect(h.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
    const ditolak = h.filter((x): x is PromiseRejectedResult => x.status === 'rejected')
    expect(ditolak).toHaveLength(1)
    expect(String(ditolak[0].reason.message)).toMatch(/Admin aktif terakhir tidak dapat dinonaktifkan|busy|locked|timed out/i)
    expect(await prisma.admin.count({ where: { aktif: true } })).toBe(1)
  })
})
