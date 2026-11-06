import { describe, it, expect, beforeEach, vi } from 'vitest'

let ip = '10.0.0.1'
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': `1.2.3.4, ${ip}` }),
}))

import { prisma } from '../../src/lib/db'
import { bersihkanSemua } from '../bantu-db'
import { POST as daftar } from '../../src/app/api/daftar/route'

const req = (data: object) => new Request('http://x/api/daftar', { method: 'POST', body: JSON.stringify(data) })
const isian = (n: number) => ({
  nama: `Guru ${n}`, statusPegawai: 'NON_ASN', nik: `52010145079000${String(n).padStart(2, '0')}`, tahunSertifikasi: '2021', jabatan: 'GURU',
})

describe('POST /api/daftar', () => {
  beforeEach(async () => {
    await bersihkanSemua()
    ip = '10.0.0.1'
  })

  it('membuat akun yang menunggu persetujuan dan mengembalikan username serta sandi 8 angka', async () => {
    const res = await daftar(req(isian(1)))
    expect(res.headers.get('cache-control')).toBe('no-store')
    const j = await res.json()
    expect(j).toMatchObject({ ok: true, akun: { username: '5201014507900001', jenis: 'NIK' } })
    expect(j.akun.sandi).toMatch(/^\d{8}$/)
    expect((await prisma.guru.findUniqueOrThrow({ where: { username: '5201014507900001' } })).disetujui).toBe(false)
  })

  it('isian salah dijawab 400 dengan pesan', async () => {
    const res = await daftar(req({ ...isian(1), nik: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).pesan).toBe('NIK wajib diisi untuk Non ASN')
  })

  it('dibatasi 30 percobaan per 15 menit per alamat IP (entri terakhir X-Forwarded-For)', async () => {
    for (let i = 0; i < 30; i++) await daftar(req({ ...isian(1), nama: '' }))
    expect((await daftar(req(isian(2)))).status).toBe(429)
    ip = '10.0.0.2'
    expect((await daftar(req(isian(2)))).status).toBe(200)
  })
})
