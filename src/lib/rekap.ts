import ExcelJS from 'exceljs'
import { prisma } from '@/lib/db'
import { hitungStatusGuru } from '@/lib/status'
import { tanggalLokal } from '@/lib/waktu'
import { LABEL_JABATAN, LABEL_PEGAWAI, dokumenWajib } from '@/lib/syarat'

export type BarisRekap = {
  nip: string
  nik: string
  nama: string
  asalSekolah: string
  jabatan: string
  statusPegawai: string
  tahunSertifikasi: string
  sertifikasiBaru: string
  jumlahSah: number
  jumlahWajib: number
  status: string
  tanggalVerifikasi: string | null
}

export const KOLOM_REKAP = [
  'NIP', 'NIK', 'Nama', 'Asal Sekolah', 'Jabatan', 'Status Kepegawaian', 'Tahun Sertifikasi', 'Sertifikasi Baru', 'Dokumen Sah', 'Dokumen Wajib', 'Status', 'Tanggal Verifikasi',
]

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
    const s = hitungStatusGuru(dokumenAktif, milik, g)
    let tanggalVerifikasi: string | null = null
    if (s.lengkap) {
      const wajib = new Set(dokumenWajib(dokumenAktif, g).map((d) => d.id))
      const waktu = milik
        .filter((d) => d.status === 'SAH' && wajib.has(d.dokumenId) && d.diperiksaPada)
        .map((d) => d.diperiksaPada!.getTime())
      if (waktu.length) tanggalVerifikasi = tanggalLokal(new Date(Math.max(...waktu)))
    }
    return {
      nip: g.nip ?? '', nik: g.nik ?? '', nama: g.nama, asalSekolah: g.asalSekolah ?? '', jabatan: LABEL_JABATAN[g.jabatan] ?? g.jabatan, statusPegawai: LABEL_PEGAWAI[g.statusPegawai ?? ''] ?? '',
      tahunSertifikasi: g.tahunSertifikasi ? String(g.tahunSertifikasi) : '', sertifikasiBaru: g.sertifikasiBaru ? 'Ya' : 'Tidak',
      jumlahSah: s.jumlahSah, jumlahWajib: s.jumlahWajib, status: s.label, tanggalVerifikasi }
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
    garis.push([b.nip, b.nik, b.nama, b.asalSekolah, b.jabatan, b.statusPegawai, b.tahunSertifikasi, b.sertifikasiBaru, b.jumlahSah, b.jumlahWajib, b.status, b.tanggalVerifikasi].map(sel).join(';'))
  }
  return '﻿' + garis.join('\r\n') + '\r\n'
}

export async function buatXlsx(baris: BarisRekap[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Rekap')
  ws.addRow(KOLOM_REKAP).font = { bold: true }
  ws.getColumn(1).numFmt = '@'
  ws.getColumn(2).numFmt = '@'
  for (const b of baris) {
    const r = ws.addRow([
      netralkanRumus(b.nip), netralkanRumus(b.nik), netralkanRumus(b.nama), netralkanRumus(b.asalSekolah), b.jabatan, b.statusPegawai, b.tahunSertifikasi, b.sertifikasiBaru, b.jumlahSah, b.jumlahWajib, netralkanRumus(b.status), netralkanRumus(b.tanggalVerifikasi ?? ''),
    ])
    // NIP 18 angka dan NIK 16 angka harus tetap teks, kalau tidak Excel membulatkannya.
    r.getCell(1).numFmt = '@'
    r.getCell(2).numFmt = '@'
  }
  ws.getColumn(1).width = 22
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 32
  ws.getColumn(4).width = 30
  ws.getColumn(5).width = 16
  ws.getColumn(6).width = 18
  ws.getColumn(11).width = 20
  ws.getColumn(12).width = 20
  return Buffer.from(await wb.xlsx.writeBuffer())
}
