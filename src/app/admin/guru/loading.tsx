import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={30} lebar={160} />
      <div className="kerangka-baris">
        {Array.from({ length: 5 }, (_, i) => <Blok key={i} tinggi={32} lebar={120} bulat />)}
      </div>
      <Blok tinggi={48} />
      <div className="kerangka-tabel">
        {Array.from({ length: 8 }, (_, i) => <Blok key={i} tinggi={44} />)}
      </div>
    </Kerangka>
  )
}
