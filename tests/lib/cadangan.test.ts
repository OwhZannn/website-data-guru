import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jalankanCadangan, pangkas } from '../../scripts/cadangan.mjs'
import { pilihTerbaru, NAMA_SUBFOLDER } from '../../scripts/cadangan-ke-drive.mjs'
import { hashSandi, buatSandiAcak } from '../../scripts/buat-admin.mjs'
import { periksaSandi } from '../../src/lib/sandi'

let dir: string
let db: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cadangan-'))
  db = join(dir, 'prod.db')
  execFileSync('sqlite3', [db, 'CREATE TABLE t(x); INSERT INTO t VALUES (1),(2),(3);'])
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const hitung = (f: string) => execFileSync('sqlite3', [f, 'SELECT COUNT(*) FROM t']).toString().trim()

describe('cadangan.mjs', () => {
  it('salinan dapat dibuka dan jumlah barisnya sama, bertanggal WITA', () => {
    // 2026-11-04 17:00 UTC = 2026-11-05 01:00 WITA
    const { tujuan } = jalankanCadangan({ berkasDb: db, dirCadangan: join(dir, 'c'), sekarang: new Date('2026-11-04T17:00:00Z') })
    expect(tujuan.endsWith('prod-2026-11-05.db')).toBe(true)
    expect(hitung(tujuan)).toBe('3')
  })

  it('menambah akhiran bila berkas hari ini sudah ada', () => {
    const o = { berkasDb: db, dirCadangan: join(dir, 'c'), sekarang: new Date('2026-11-04T04:00:00Z') }
    jalankanCadangan(o)
    const b = jalankanCadangan(o)
    expect(b.tujuan.endsWith('prod-2026-11-04-2.db')).toBe(true)
  })

  it('menyimpan 30 terbaru dan tidak menyentuh berkas lain', () => {
    const c = join(dir, 'c')
    jalankanCadangan({ berkasDb: db, dirCadangan: c })
    for (let i = 0; i < 35; i++) {
      const t = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
      writeFileSync(join(c, `prod-${t}.db`), 'x')
    }
    writeFileSync(join(c, 'catatan.txt'), 'x')
    writeFileSync(join(c, 'prod-lama.db'), 'x')
    writeFileSync(join(c, 'prod-2026-01-01.db.bak'), 'x')
    pangkas(c, 30)
    const sisa = readdirSync(c)
    expect(sisa.filter((f) => /^prod-\d{4}-\d{2}-\d{2}(-\d+)?\.db$/.test(f))).toHaveLength(30)
    expect(sisa).toEqual(expect.arrayContaining(['catatan.txt', 'prod-lama.db', 'prod-2026-01-01.db.bak']))
  })

  it('gagal bila basis data tidak ada', () => {
    expect(() => jalankanCadangan({ berkasDb: join(dir, 'tidak.db'), dirCadangan: join(dir, 'c') })).toThrow()
  })
})

describe('cadangan-ke-drive.mjs', () => {
  it('memilih berkas terbaru dan mengabaikan nama lain', () => {
    expect(pilihTerbaru(['prod-2026-01-02.db', 'prod-2026-01-02-2.db', 'prod-2025-12-31.db', 'x.txt', 'prod-2026-01-02-10.db'])).toBe('prod-2026-01-02-10.db')
    expect(pilihTerbaru(['x.txt'])).toBeNull()
    expect(NAMA_SUBFOLDER).toBe('Cadangan Basis Data')
  })
})

describe('buat-admin.mjs', () => {
  it('hash yang dihasilkan lolos periksaSandi', async () => {
    const s = buatSandiAcak()
    expect(s.length).toBeGreaterThanOrEqual(16)
    const h = await hashSandi(s)
    expect(await periksaSandi(s, h)).toBe(true)
    expect(await periksaSandi('salah', h)).toBe(false)
  })
})
