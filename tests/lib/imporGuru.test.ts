import { describe, it, expect, beforeEach, vi } from 'vitest'
import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { imporGuru, uraiDaftarGuru, acakSandiAwal } from '../../src/lib/imporGuru'
import { periksaSandi } from '../../src/lib/sandi'
import { aturAktifGuru, aturUlangSandiGuru } from '../../src/lib/kelolaGuru'

describe('uraiDaftarGuru', () => {
  it('mendeteksi pemisah per baris, melewati kosong dan header', () => {
    const h = uraiDaftarGuru('Nama;NIP;Email\n\nSiti;123;s@x.id\r\nBudi, 456 , b@x.id\n')
    expect(h).toEqual([
      { nama: 'Siti', nip: '123', email: 's@x.id' },
      { nama: 'Budi', nip: '456', email: 'b@x.id' },
    ])
  })
  it('baris kurang kolom tetap dikembalikan agar ditolak saat validasi', () => {
    expect(uraiDaftarGuru('Siti;123')).toEqual([{ nama: 'Siti', nip: '123', email: '' }])
  })
})

describe('acakSandiAwal', () => {
  it('10 karakter, unik, tanpa karakter ambigu', () => {
    const s = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const p = acakSandiAwal()
      expect(p).toHaveLength(10)
      expect(p).not.toMatch(/[0OlI1]/)
      s.add(p)
    }
    expect(s.size).toBe(1000)
  })
})

describe('imporGuru', () => {
  let adminId: string
  beforeEach(async () => {
    await bersihkanSemua()
    adminId = (await prisma.admin.create({ data: { nama: 'A', email: 'a@x.id', hashSandi: 'x' } })).id
    await prisma.periode.create({ data: { nama: 'P', dibuka: true } })
  })

  it('membuat akun, email dinormalkan, sandi bisa dipakai', async () => {
    const h = await imporGuru({ baris: [{ nama: ' Siti ', nip: '12 34', email: ' Siti@Contoh.ID ' }], adminId })
    expect(h.dibuat).toBe(1)
    const g = await prisma.guru.findUniqueOrThrow({ where: { email: 'siti@contoh.id' } })
    expect(g.nip).toBe('1234')
    expect(g.nama).toBe('Siti')
    expect(await periksaSandi(h.sandiAwal[0].sandi, g.hashSandi)).toBe(true)
  })

  it('melewati yang sudah ada tanpa mengubahnya', async () => {
    await imporGuru({ baris: [{ nama: 'Siti', nip: '1', email: 's@x.id' }], adminId })
    const h = await imporGuru({ baris: [{ nama: 'Lain', nip: '1', email: 'baru@x.id' }], adminId })
    expect(h).toMatchObject({ dibuat: 0, dilewati: 1, sandiAwal: [] })
    expect((await prisma.guru.findUniqueOrThrow({ where: { nip: '1' } })).nama).toBe('Siti')
  })

  it('menolak baris tidak valid dan ganda dalam daftar', async () => {
    const h = await imporGuru({
      baris: [
        { nama: 'A', nip: '1', email: 'a1@x.id' },
        { nama: '', nip: '2', email: 'a2@x.id' },
        { nama: 'C', nip: 'abc', email: 'a3@x.id' },
        { nama: 'D', nip: '4', email: 'bukan-email' },
        { nama: 'E', nip: '1', email: 'e@x.id' },
        { nama: 'F', nip: '6', email: 'A1@x.id' },
      ],
      adminId,
    })
    expect(h.dibuat).toBe(1)
    expect(h.ditolak.map((d) => d.baris)).toEqual([2, 3, 4, 5, 6])
    expect(h.ditolak[3].alasan).toBe('NIP atau email ganda dalam daftar')
    expect(await prisma.guru.count()).toBe(1)
    expect((await prisma.guru.findUniqueOrThrow({ where: { nip: '1' } })).email).toBe('a1@x.id')
  })

  it('menolak lebih dari 500 baris', async () => {
    const baris = Array.from({ length: 501 }, (_, i) => ({ nama: 'G', nip: String(i + 1), email: `g${i}@x.id` }))
    await expect(imporGuru({ baris, adminId })).rejects.toThrow('Maksimal 500 baris per impor')
  })

  it('batch yang bentrok tidak menghentikan impor; sandi dan riwayat tetap ada', async () => {
    const asli = prisma.guru.createMany.bind(prisma.guru)
    const spy = vi.spyOn(prisma.guru, 'createMany').mockImplementationOnce((async (a: never) => {
      await prisma.guru.create({ data: { nama: 'Bentrok', nip: '2', email: 'dua@x.id', hashSandi: 'x' } })
      return asli(a)
    }) as never)
    const h = await imporGuru({
      baris: [1, 2, 3].map((n) => ({ nama: `G${n}`, nip: String(n), email: `${n === 2 ? 'dua' : 'g' + n}@x.id` })),
      adminId,
    })
    spy.mockRestore()
    expect(h).toMatchObject({ dibuat: 2, dilewati: 1, ditolak: [] })
    expect(h.sandiAwal.map((s) => s.email).sort()).toEqual(['g1@x.id', 'g3@x.id'])
    expect((await prisma.guru.findUniqueOrThrow({ where: { nip: '2' } })).nama).toBe('Bentrok')
    const r = await prisma.riwayat.findMany({ where: { aksi: 'impor_guru' } })
    expect(r.map((x) => x.alasan)).toEqual(['Impor: 2 dibuat, 1 dilewati, 0 ditolak'])
  })

  it('mencatat satu riwayat ringkasan', async () => {
    await imporGuru({ baris: [{ nama: 'A', nip: '1', email: 'a@x.id' }, { nama: '', nip: '2', email: 'b@x.id' }], adminId })
    const r = await prisma.riwayat.findMany({ where: { aksi: 'impor_guru' } })
    expect(r).toHaveLength(1)
    expect(r[0].alasan).toBe('Impor: 1 dibuat, 0 dilewati, 1 ditolak')
  })

  it('atur ulang sandi dan nonaktifkan menghapus sesi', async () => {
    const h = await imporGuru({ baris: [{ nama: 'A', nip: '1', email: 'a@x.id' }], adminId })
    const g = await prisma.guru.findUniqueOrThrow({ where: { nip: '1' } })
    await prisma.sesi.create({ data: { token: 't1', pemilikId: g.id, tipe: 'guru', kedaluwarsa: new Date(Date.now() + 1e6) } })
    const { sandi } = await aturUlangSandiGuru(g.id)
    expect(sandi).not.toBe(h.sandiAwal[0].sandi)
    expect(await prisma.sesi.count()).toBe(0)
    expect(await periksaSandi(sandi, (await prisma.guru.findUniqueOrThrow({ where: { id: g.id } })).hashSandi)).toBe(true)
    await prisma.sesi.create({ data: { token: 't2', pemilikId: g.id, tipe: 'guru', kedaluwarsa: new Date(Date.now() + 1e6) } })
    await aturAktifGuru(g.id, false)
    expect(await prisma.sesi.count()).toBe(0)
    expect((await prisma.guru.findUniqueOrThrow({ where: { id: g.id } })).aktif).toBe(false)
  })
})
