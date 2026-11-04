import { statusDriveTersimpan } from '@/lib/kesehatan'

export default async function BannerDrive() {
  const s = await statusDriveTersimpan()
  if (s.drive === 'ok') return null
  return (
    <div role="alert" data-testid="banner-drive" style={{ background: '#fdecea', color: '#b71c1c', border: '1px solid #b71c1c', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
      <strong>Google Drive bermasalah: {s.pesan}</strong>
      <div>Periksa token OAuth (lihat README) sebelum membuka periode.</div>
    </div>
  )
}
