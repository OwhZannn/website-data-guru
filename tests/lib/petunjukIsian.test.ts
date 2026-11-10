import { describe, it, expect } from 'vitest'
import { PETUNJUK, bantuanIdentitas } from '../../src/lib/petunjukIsian'
import { DAFTAR_ISI, barisDokumenBaku } from '../../src/app/panduan/isi'

describe('petunjukIsian', () => {
  it('memiliki contoh dan bantuan untuk setiap kolom penting', () => {
    expect(PETUNJUK.nama.contoh).toMatch(/^Contoh:/)
    expect(PETUNJUK.nip.contoh).toMatch(/^Contoh: \d{18}$/)
    expect(PETUNJUK.nik.contoh).toMatch(/^Contoh: \d{16}$/)
    expect(PETUNJUK.tahunSertifikasi.contoh).toMatch(/^Contoh: \d{4}$/)
    expect(PETUNJUK.asalSekolah.contoh).toMatch(/^Contoh:/)
  })

  it('bantuanIdentitas menyesuaikan status dan nonAsn', () => {
    expect(bantuanIdentitas('', false)).toContain('Pilih status kepegawaian dulu')
    expect(bantuanIdentitas('NON_ASN', true)).toContain('NIK sebagai username')
    expect(bantuanIdentitas('PNS', false)).toContain('NIP sebagai username')
    expect(bantuanIdentitas('PPPK', false)).toContain('NIP sebagai username')
  })
})

describe('panduan/isi', () => {
  it('daftar isi memuat bagian guru, admin, dan lampiran', () => {
    expect(DAFTAR_ISI.guru.length).toBeGreaterThanOrEqual(9)
    expect(DAFTAR_ISI.admin.length).toBeGreaterThanOrEqual(10)
    expect(DAFTAR_ISI.lampiran.length).toBeGreaterThanOrEqual(3)
  })

  it('barisDokumenBaku memuat daftar dokumen yang lengkap', () => {
    const baris = barisDokumenBaku()
    expect(baris.length).toBeGreaterThanOrEqual(10)
    const namaDok = baris.map((b) => b.nama)
    expect(namaDok.some((n) => n.toLowerCase().includes('siaga'))).toBe(true)
    expect(namaDok.some((n) => n.toLowerCase().includes('sk kenaikan pangkat'))).toBe(true)
  })
})
