import ExcelJS from 'exceljs'
import { prisma } from '@/lib/db'
import { hitungStatusGuru } from '@/lib/status'
import { tanggalLokal } from '@/lib/waktu'

export type BarisRekap = {
  nip: string
  nama: string
  jumlahSah: number
  jumlahWajib: number
  status: string
  tanggalVerifikasi: string | null
}

export const KOLOM_REKAP = ['NIP', 'Nama', 'Dokumen Sah', 'Dokumen Wajib', 'Status', 'Tanggal Verifikasi']

/** Satu baris per guru aktif, urut nama. Dua query untuk seluruh guru (tanpa N+1). */
export async function susunRekap(periodeId: string): Promise<BarisRekap[]> {
  const [guru, dokumenAktif, dokumenGuru] = await Promise.all([
    prisma.guru.findMany({ where: { aktif: true }, orderBy: [{ nama: 'asc' }, { id: 'asc' }] }),
    prisma.daftarDokumen.findMany({ where: { periodeId, aktif: true } }),
    prisma.dokumenGuru.findMany({ where: { periodeId } }),
  ])
  const perGuru = new Map<string, typeof dokumenGuru>()
  for (const d of dokumenGuru) {
    const l = perGuru.get(d.guruId)
    if (l) l.push(d)
    else perGuru.set(d.guruId, [d])
  }
  return guru.map((g) => {
    const milik = perGuru.get(g.id) ?? []
    const s = hitungStatusGuru(dokumenAktif, milik)
    let tanggalVerifikasi: string | null = null
    if (s.lengkap) {
      const wajib = new Set(dokumenAktif.map((d) => d.id))
      const waktu = milik
        .filter((d) => d.status === 'SAH' && wajib.has(d.dokumenId) && d.diperiksaPada)
        .map((d) => d.diperiksaPada!.getTime())
      if (waktu.length) tanggalVerifikasi = tanggalLokal(new Date(Math.max(...waktu)))
    }
    return { nip: g.nip, nama: g.nama, jumlahSah: s.jumlahSah, jumlahWajib: s.jumlahWajib, status: s.label, tanggalVerifikasi }
  })
}

/** Netralkan injeksi rumus spreadsheet. */
export function netralkanRumus(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
}

function sel(v: string | number | null): string {
  const s = netralkanRumus(v === null ? '' : String(v))
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buatCsv(baris: BarisRekap[]): string {
  const garis = [KOLOM_REKAP.join(';')]
  for (const b of baris) {
    garis.push([b.nip, b.nama, b.jumlahSah, b.jumlahWajib, b.status, b.tanggalVerifikasi].map(sel).join(';'))
  }
  return '﻿' + garis.join('\r\n') + '\r\n'
}

export async function buatXlsx(baris: BarisRekap[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Rekap')
  ws.addRow(KOLOM_REKAP).font = { bold: true }
  ws.getColumn(1).numFmt = '@'
  for (const b of baris) {
    const r = ws.addRow([
      netralkanRumus(b.nip), netralkanRumus(b.nama), b.jumlahSah, b.jumlahWajib, b.status, b.tanggalVerifikasi ?? '',
    ])
    r.getCell(1).numFmt = '@'
  }
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 32
  ws.getColumn(5).width = 20
  ws.getColumn(6).width = 20
  return Buffer.from(await wb.xlsx.writeBuffer())
}
