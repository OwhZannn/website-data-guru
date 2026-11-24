import { halamanAdmin } from '@/lib/halaman'
import { semuaPeriode } from '@/lib/pilihPeriode'
import { sisaWaktu, tanggalDariTenggat, teksTenggat, teksTenggatPendek } from '@/lib/tenggat'
import KelolaPeriode from '@/components/KelolaPeriode'

export const dynamic = 'force-dynamic'

export default async function HalamanPeriode() {
  await halamanAdmin()
  const periode = await semuaPeriode()
  return (
    <div className="halaman-tabel">
      <KelolaPeriode
        periode={periode.map((p) => ({
          id: p.id,
          nama: p.nama,
          dibuka: p.dibuka,
          tenggat: p.tenggat ? { tanggal: tanggalDariTenggat(p.tenggat), teks: teksTenggatPendek(p.tenggat), judul: teksTenggat(p.tenggat), sisa: p.dibuka ? sisaWaktu(p.tenggat) : null } : null,
        }))}
      />
    </div>
  )
}
