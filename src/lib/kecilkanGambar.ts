/**
 * Mengecilkan foto JPEG di peramban sebelum diunggah. Hanya mengoptimalkan, bukan gerbang:
 * pada kegagalan apa pun, berkas asli dikembalikan dan tidak pernah melempar galat.
 */
export async function kecilkanGambar(
  berkas: File,
  opsi: { sisiMaks?: number; mutu?: number } = {},
): Promise<File> {
  const sisiMaks = opsi.sisiMaks ?? 2000
  const mutu = opsi.mutu ?? 0.85
  const nama = berkas.name.toLowerCase()
  const jpeg = berkas.type === 'image/jpeg' || (berkas.type === '' && /\.jpe?g$/.test(nama))
  if (!jpeg) return berkas

  try {
    // 'from-image' menerapkan rotasi EXIF ponsel sebelum EXIF dibuang saat dienkode ulang.
    const bmp = await createImageBitmap(berkas, { imageOrientation: 'from-image' })
    try {
      const skala = Math.min(1, sisiMaks / Math.max(bmp.width, bmp.height))
      const lebar = Math.max(1, Math.round(bmp.width * skala))
      const tinggi = Math.max(1, Math.round(bmp.height * skala))
      const kanvas = document.createElement('canvas')
      kanvas.width = lebar
      kanvas.height = tinggi
      const ctx = kanvas.getContext('2d')
      if (!ctx) return berkas
      ctx.drawImage(bmp, 0, 0, lebar, tinggi)
      const blob = await new Promise<Blob | null>((res) => kanvas.toBlob(res, 'image/jpeg', mutu))
      if (!blob || blob.size >= berkas.size) return berkas
      return new File([blob], berkas.name, { type: 'image/jpeg', lastModified: berkas.lastModified })
    } finally {
      bmp.close()
    }
  } catch {
    return berkas
  }
}
