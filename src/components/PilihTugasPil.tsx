'use client'
import { useId } from 'react'
import { Check } from 'lucide-react'
import { TUGAS, type KunciTugas } from '@/lib/syarat'

/**
 * Pilihan tugas tambahan berupa pil yang bisa dipilih beberapa sekaligus. Hanya mengubah nilai di formulir;
 * penyimpanan terjadi bersama profil saat tombol simpan ditekan.
 */
export default function PilihTugasPil(p: {
  nilai: Record<KunciTugas, boolean>
  onUbah: (k: KunciTugas, v: boolean) => void
  disabled?: boolean
}) {
  const idJudul = useId()
  const jumlah = Object.values(p.nilai).filter(Boolean).length
  return (
    <div className="tugas-pil-wrap" role="group" aria-labelledby={idJudul}>
      <div className="tugas-pil-judul" id={idJudul}>
        Tugas tambahan
        <span className="redup">{jumlah > 0 ? `${jumlah} dipilih` : 'Pilih yang sesuai, boleh lebih dari satu'}</span>
      </div>
      <div className="tugas-pil-daftar">
        {TUGAS.map(([k, l]) => (
          <label className="tugas-pil" key={k}>
            <input
              type="checkbox"
              className="sr-only"
              checked={p.nilai[k]}
              disabled={p.disabled}
              onChange={(e) => p.onUbah(k, e.target.checked)}
            />
            {p.nilai[k] && <Check className="tugas-pil__ikon" size={14} strokeWidth={3} aria-hidden="true" />}
            <span>{l}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
