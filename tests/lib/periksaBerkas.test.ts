import { describe, it, expect } from 'vitest'
import { periksaBerkas, BATAS_UKURAN } from '../../src/lib/periksaBerkas'

const pdf = Buffer.from('%PDF-1.4\n...isi...')
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

describe('periksaBerkas', () => {
  it('menerima PDF yang benar', () => {
    expect(periksaBerkas({ nama: 'ijazah.pdf', tipe: 'application/pdf', isi: pdf })).toEqual({ sah: true, tipe: 'application/pdf' })
  })
  it('menerima JPG yang benar', () => {
    expect(periksaBerkas({ nama: 'foto.jpg', tipe: 'image/jpeg', isi: jpg })).toEqual({ sah: true, tipe: 'image/jpeg' })
  })
  it('menolak file yang hanya diganti namanya', () => {
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00])
    expect(periksaBerkas({ nama: 'ijazah.pdf', tipe: 'application/pdf', isi: exe }).sah).toBe(false)
  })
  it('menolak isi tak dikenal apa pun nama dan tipenya', () => {
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00])
    expect(periksaBerkas({ nama: 'foto.jpg', tipe: 'image/jpeg', isi: exe }).sah).toBe(false)
    expect(periksaBerkas({ nama: 'a.exe', tipe: 'application/octet-stream', isi: exe }).sah).toBe(false)
  })
  it('menolak file yang melebihi batas ukuran', () => {
    const besar = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(BATAS_UKURAN)])
    expect(periksaBerkas({ nama: 'besar.pdf', tipe: 'application/pdf', isi: besar })).toEqual({
      sah: false,
      pesan: expect.stringContaining('5 MB'),
    })
  })
  it('menolak berkas kosong', () => {
    expect(periksaBerkas({ nama: 'a.pdf', tipe: 'application/pdf', isi: Buffer.alloc(0) }).sah).toBe(false)
  })
  it('menolak tipe yang tidak diizinkan walau isinya PDF', () => {
    expect(
      periksaBerkas({
        nama: 'a.docx',
        tipe: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        isi: pdf,
      }).sah,
    ).toBe(false)
  })
  it('menolak JPG yang isinya ternyata PDF', () => {
    expect(periksaBerkas({ nama: 'a.jpg', tipe: 'image/jpeg', isi: pdf }).sah).toBe(false)
  })
  it('menerima PDF bertipe octet-stream dan melaporkan tipe terdeteksi', () => {
    expect(periksaBerkas({ nama: 'a.pdf', tipe: 'application/octet-stream', isi: pdf })).toEqual({ sah: true, tipe: 'application/pdf' })
  })
  it('menerima JPG bertipe kosong dan melaporkan tipe terdeteksi', () => {
    expect(periksaBerkas({ nama: 'a.jpg', tipe: '', isi: jpg })).toEqual({ sah: true, tipe: 'image/jpeg' })
  })
})

describe('periksaBerkas normalisasi MIME', () => {
  it('menerima tipe berhuruf besar dan berparameter', () => {
    const p = Buffer.from('%PDF-1.4')
    const j = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    expect(periksaBerkas({ nama: 'a.jpg', tipe: 'image/JPEG', isi: j })).toEqual({ sah: true, tipe: 'image/jpeg' })
    expect(periksaBerkas({ nama: 'a.pdf', tipe: 'application/pdf; charset=binary', isi: p })).toEqual({ sah: true, tipe: 'application/pdf' })
  })
})
