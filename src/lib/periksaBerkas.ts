/** Batas ukuran satu berkas unggahan (3 MB). Dipakai di browser dan di server. */
export const BATAS_UKURAN = 3 * 1024 * 1024
export const TEKS_BATAS = '3 MB'

const adalahPdf = (b: Buffer) => b.subarray(0, 5).equals(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]))
const adalahJpg = (b: Buffer) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))

export function periksaBerkas(masukan: {
  nama: string
  tipe: string
  isi: Buffer
}): { sah: true; tipe: 'application/pdf' | 'image/jpeg' } | { sah: false; pesan: string } {
  const { isi } = masukan
  const tipe = masukan.tipe.split(';')[0].trim().toLowerCase()
  if (isi.length === 0) return { sah: false, pesan: 'Berkas kosong' }
  if (isi.length > BATAS_UKURAN) return { sah: false, pesan: `Ukuran berkas melebihi ${TEKS_BATAS}` }
  const terdeteksi = adalahPdf(isi) ? 'application/pdf' : adalahJpg(isi) ? 'image/jpeg' : null
  if (!terdeteksi) return { sah: false, pesan: 'Isi berkas bukan PDF atau JPG yang sah' }
  if (tipe !== '' && tipe !== 'application/octet-stream' && tipe !== terdeteksi)
    return { sah: false, pesan: 'Tipe berkas harus PDF atau JPG dan sesuai isinya' }
  return { sah: true, tipe: terdeteksi }
}
