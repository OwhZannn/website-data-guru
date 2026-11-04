import { describe, it, expect, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { prisma } from '../../src/lib/db'
import { susunRekap, buatCsv, buatXlsx } from '../../src/lib/rekap'
import { bersihkanSemua } from '../bantu-db'

let periodeId: string
const lengkapi = async (guruId: string, dokId: string, status: string, diperiksaPada?: Date) =>
  prisma.dokumenGuru.create({
    data: { periodeId, guruId, dokumenId: dokId, status, fileId: 'f', namaFile: 'a.pdf', tipe: 'application/pdf', ukuran: 1, diunggahPada: new Date(), diperiksaPada },
  })

beforeEach(async () => {
  await bersihkanSemua()
  periodeId = (await prisma.periode.create({ data: { nama: 'P1', dibuka: true } })).id
})

describe('susunRekap', () => {
  it('menyertakan semua guru aktif (juga yang belum unggah), urut nama, tanpa guru nonaktif', async () => {
    const d = await prisma.daftarDokumen.create({ data: { periodeId, nama: 'D', urutan: 0 } })
    const mk = (nama: string, nip: string, aktif = true) => prisma.guru.create({ data: { nama, nip, email: `${nip}@x.id`, hashSandi: 'x', aktif } })
    const b = await mk('Budi', '002'); await mk('Ani', '001'); await mk('Cici', '003', false)
    await lengkapi(b.id, d.id, 'MENUNGGU')
    const r = await susunRekap(periodeId)
    expect(r.map((x) => x.nama)).toEqual(['Ani', 'Budi'])
    expect(r.map((x) => x.status)).toEqual(['Belum mulai', 'Perlu dicek'])
  })

  it('jumlah baris sama dengan jumlah guru aktif yang di-seed', async () => {
    for (let i = 0; i < 7; i++) await prisma.guru.create({ data: { nama: `G${i}`, nip: `n${i}`, email: `g${i}@x.id`, hashSandi: 'x', aktif: i !== 3 } })
    const aktif = await prisma.guru.count({ where: { aktif: true } })
    expect(aktif).toBe(6)
    expect(await susunRekap(periodeId)).toHaveLength(aktif)
  })

  it('mengisi tanggalVerifikasi (WITA, terbaru) hanya untuk guru lengkap', async () => {
    const [d1, d2] = await Promise.all([0, 1].map((u) => prisma.daftarDokumen.create({ data: { periodeId, nama: `D${u}`, urutan: u } })))
    const a = await prisma.guru.create({ data: { nama: 'A', nip: '1', email: 'a@x.id', hashSandi: 'x' } })
    const b = await prisma.guru.create({ data: { nama: 'B', nip: '2', email: 'b@x.id', hashSandi: 'x' } })
    await lengkapi(a.id, d1.id, 'SAH', new Date('2026-11-03T10:00:00Z'))
    await lengkapi(a.id, d2.id, 'SAH', new Date('2026-11-03T17:00:00Z')) // 01:00 WITA 4 Nov
    await lengkapi(b.id, d1.id, 'SAH', new Date('2026-11-03T10:00:00Z'))
    const r = await susunRekap(periodeId)
    expect(r[0]).toMatchObject({ nama: 'A', status: 'Lengkap', jumlahSah: 2, jumlahWajib: 2, tanggalVerifikasi: '2026-11-04' })
    expect(r[1]).toMatchObject({ nama: 'B', jumlahSah: 1, tanggalVerifikasi: null })
  })
})

const baris = (o: Partial<Parameters<typeof buatCsv>[0][0]> = {}) => ({
  nip: '1', nama: 'Siti', jumlahSah: 5, jumlahWajib: 5, status: 'Lengkap', tanggalVerifikasi: '2026-11-04', ...o,
})

describe('buatCsv', () => {
  it('memakai BOM, titik-koma, CRLF, dan header yang benar', () => {
    const csv = buatCsv([baris()])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const l = csv.slice(1).split('\r\n')
    expect(l[0]).toBe('NIP;Nama;Dokumen Sah;Dokumen Wajib;Status;Tanggal Verifikasi')
    expect(l[1]).toBe('1;Siti;5;5;Lengkap;2026-11-04')
  })
  it('mengutip nilai berisiko dan menggandakan tanda kutip', () => {
    const csv = buatCsv([baris({ nama: 'A;B "C"\nD' })])
    expect(csv).toContain('"A;B ""C""\nD"')
  })
  it('menetralkan injeksi rumus', () => {
    for (const awal of ['=1+1', '+1', '-1', '@x', '\tx', '\rx']) {
      const csv = buatCsv([baris({ nama: awal })])
      expect(csv).toContain(`'${awal}`)
    }
  })
  it('tanggal kosong menjadi sel kosong', () => {
    expect(buatCsv([baris({ tanggalVerifikasi: null })])).toContain('Lengkap;\r\n')
  })
})

describe('buatXlsx', () => {
  it('tidak ada sel teks yang diawali karakter rumus tanpa apostrof', async () => {
    const buf = await buatXlsx([baris({ nip: '=1', nama: '+a', status: '-b', tanggalVerifikasi: '@c' }), baris({ nama: '\tx', status: '\rx' })])
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as unknown as ArrayBuffer)
    let teks = 0
    wb.worksheets[0].eachRow((r) => r.eachCell((c) => {
      if (typeof c.value === 'string') { teks++; expect(c.value).not.toMatch(/^[=+\-@\t\r]/) }
    }))
    expect(teks).toBeGreaterThan(8)
  })

  it('menyimpan NIP sebagai teks, header tebal, dan menetralkan rumus', async () => {
    const buf = await buatXlsx([baris({ nip: '00123', nama: '=HYPERLINK("x")' })])
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf as unknown as ArrayBuffer)
    const ws = wb.worksheets[0]
    expect(ws.getRow(1).values).toEqual([undefined, 'NIP', 'Nama', 'Dokumen Sah', 'Dokumen Wajib', 'Status', 'Tanggal Verifikasi'])
    expect(ws.getRow(1).font?.bold).toBe(true)
    expect(ws.getCell('A2').value).toBe('00123')
    expect(ws.getCell('B2').value).toBe(`'=HYPERLINK("x")`)
  })
})
