import { statusDriveTersimpan } from '@/lib/kesehatan'

export default async function BannerDrive() {
  const s = await statusDriveTersimpan()
  if (s.drive === 'ok') return null
  return (
    <div role="alert" data-testid="banner-drive" className="banner-drive">
      <strong>Google Drive bermasalah: {s.pesan}</strong>
      <div>Periksa token OAuth (lihat README) sebelum membuka periode.</div>
    </div>
  )
}
