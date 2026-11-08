import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka className="dua">
      <div className="dua-kiri">
        <Blok tinggi={14} lebar={200} />
        <Blok tinggi={30} lebar={180} />
        <Blok tinggi={180} />
        <Blok tinggi={108} />
      </div>
      <div className="dua-kanan">
        {Array.from({ length: 4 }, (_, i) => <Blok key={i} tinggi={120} />)}
      </div>
    </Kerangka>
  )
}
