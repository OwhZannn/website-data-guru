import { describe, it, expect } from 'vitest'
import { ariaSort, arahBerikut, bangunTautan, teksRentang, urlDariIsian, samaParam } from '../../src/lib/dataTable'
import { formatAktivitas } from '../../src/lib/aktivitas'

describe('ariaSort / arahBerikut', () => {
  it('hanya kolom aktif yang berarah', () => {
    expect(ariaSort('asc')).toBe('ascending')
    expect(ariaSort('desc')).toBe('descending')
    expect(ariaSort(null)).toBe('none')
    expect(ariaSort(undefined)).toBe('none')
  })
  it('klik berikutnya: menaik → menurun → menaik; kolom baru mulai menaik', () => {
    expect(arahBerikut(null)).toBe('asc')
    expect(arahBerikut('asc')).toBe('desc')
    expect(arahBerikut('desc')).toBe('asc')
  })
})

describe('bangunTautan', () => {
  it('membuang nilai kosong dan menimpa dengan perubahan', () => {
    expect(bangunTautan({ periode: 'p1', q: '', status: undefined, per: 20 }, { hal: 2 })).toBe('?periode=p1&per=20&hal=2')
    expect(bangunTautan({ periode: 'p1', hal: 3 }, { hal: undefined })).toBe('?periode=p1')
  })
  it('tanpa parameter menghasilkan "?"', () => {
    expect(bangunTautan({ q: '' })).toBe('?')
  })
  it('menyandikan nilai', () => {
    expect(bangunTautan({ q: 'a b&c' })).toBe('?q=a+b%26c')
  })
})

describe('teksRentang', () => {
  it('rentang biasa dan kosong', () => {
    expect(teksRentang(1, 20, 45, 'guru')).toBe('Menampilkan 1–20 dari 45 guru')
    expect(teksRentang(21, 25, 25)).toBe('Menampilkan 21–25 dari 25')
    expect(teksRentang(0, 0, 0, 'guru')).toBe('Menampilkan 0 dari 0 guru')
  })
})

describe('urlDariIsian', () => {
  it('membuang isian kosong dan halaman, menjaga sisanya', () => {
    const d = new FormData()
    d.append('periode', 'p1'); d.append('q', ''); d.append('status', 'lengkap'); d.append('hal', '3'); d.append('per', '50')
    expect(urlDariIsian('/admin/guru', d as unknown as Iterable<[string, FormDataEntryValue]>)).toBe('/admin/guru?periode=p1&status=lengkap&per=50')
  })
  it('tanpa isian mengembalikan jalur saja', () => {
    expect(urlDariIsian('/admin/antrean', [])).toBe('/admin/antrean')
  })
})

describe('samaParam', () => {
  it('tidak peduli urutan', () => {
    expect(samaParam(new URLSearchParams('a=1&b=2'), new URLSearchParams('b=2&a=1'))).toBe(true)
    expect(samaParam(new URLSearchParams('a=1'), new URLSearchParams('a=2'))).toBe(false)
  })
})

describe('formatAktivitas', () => {
  const kini = new Date('2026-11-09T12:00:00Z')
  it('relatif untuk seminggu terakhir', () => {
    expect(formatAktivitas(kini.getTime() - 3600_000, kini)).toBe('Hari ini')
    expect(formatAktivitas(kini.getTime() - 86400_000 * 1.2, kini)).toBe('Kemarin')
    expect(formatAktivitas(kini.getTime() - 86400_000 * 3.5, kini)).toBe('3 hari lalu')
  })
  it('tanggal untuk yang lebih lama', () => {
    expect(formatAktivitas(kini.getTime() - 86400_000 * 20, kini)).toMatch(/\d/)
  })
})
