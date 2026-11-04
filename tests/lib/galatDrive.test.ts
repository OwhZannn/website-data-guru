import { describe, it, expect } from 'vitest'
import { terjemahkanGalatDrive as t } from '../../src/lib/galatDrive'

const TERPUTUS = 'Hubungan ke Google Drive terputus. Hubungi admin.'
const PENUH = 'Penyimpanan Google Drive penuh. Hubungi admin.'
const KONEKSI = 'Koneksi sedang bermasalah. Silakan coba lagi.'
const UMUM = 'Gagal menyimpan ke Google Drive. Silakan coba lagi.'

describe('terjemahkanGalatDrive', () => {
  it('invalid_grant dan unauthorized_client', () => {
    expect(t(new Error('invalid_grant'))).toEqual({ pesan: TERPUTUS, perluTindakan: true })
    expect(t({ response: { data: { error: 'invalid_grant' } } })).toEqual({ pesan: TERPUTUS, perluTindakan: true })
    expect(t(new Error('unauthorized_client'))).toEqual({ pesan: TERPUTUS, perluTindakan: true })
  })
  it('401 dan 403 polos', () => {
    expect(t({ code: 401 })).toEqual({ pesan: TERPUTUS, perluTindakan: true })
    expect(t({ response: { status: 401 } }).pesan).toBe(TERPUTUS)
    expect(t({ code: 403, errors: [{ reason: 'insufficientFilePermissions' }] })).toEqual({ pesan: TERPUTUS, perluTindakan: true })
    expect(t({ status: 403 }).pesan).toBe(TERPUTUS)
  })
  it('kuota penuh', () => {
    expect(t({ code: 403, errors: [{ reason: 'storageQuotaExceeded' }] })).toEqual({ pesan: PENUH, perluTindakan: true })
    expect(t({ code: 403, errors: [{ reason: 'quotaExceeded' }] }).pesan).toBe(PENUH)
    expect(t(new Error('The user storageQuotaExceeded')).pesan).toBe(PENUH)
  })
  it('jaringan, 5xx, dan 429', () => {
    for (const k of ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'])
      expect(t(new Error(`connect ${k} 1.2.3.4`))).toEqual({ pesan: KONEKSI, perluTindakan: false })
    expect(t({ code: 'ECONNRESET' }).pesan).toBe(KONEKSI)
    expect(t({ code: 500 }).pesan).toBe(KONEKSI)
    expect(t({ response: { status: 503 } }).pesan).toBe(KONEKSI)
    expect(t({ status: 429 })).toEqual({ pesan: KONEKSI, perluTindakan: false })
  })
  it('env belum diisi', () => {
    expect(t(new Error('Variabel lingkungan GOOGLE_CLIENT_ID belum diisi')))
      .toEqual({ pesan: 'Google Drive belum dikonfigurasi. Hubungi admin.', perluTindakan: true })
  })
  it('lainnya dan nilai bukan Error', () => {
    expect(t(new Error('aneh'))).toEqual({ pesan: UMUM, perluTindakan: false })
    expect(t({ code: 404 }).pesan).toBe(UMUM)
    expect(t('teks')).toEqual({ pesan: UMUM, perluTindakan: false })
    expect(t(null)).toEqual({ pesan: UMUM, perluTindakan: false })
    expect(t(undefined).pesan).toBe(UMUM)
  })
  it('tidak membocorkan teks mentah', () => {
    for (const e of [new Error('invalid_grant'), new Error('ETIMEDOUT'), 'rahasia-xyz'])
      expect(t(e).pesan).not.toMatch(/invalid_grant|ETIMEDOUT|rahasia/)
  })
})
