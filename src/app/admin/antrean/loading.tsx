import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={14} lebar={200} />
      <Blok tinggi={30} lebar={200} />
      <Blok tinggi={48} />
      <div className="kerangka-tabel">
        {Array.from({ length: 8 }, (_, i) => <Blok key={i} tinggi={44} />)}
      </div>
    </Kerangka>
  )
}
