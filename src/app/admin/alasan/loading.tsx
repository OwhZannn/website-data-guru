import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={30} lebar={200} />
      <Blok tinggi={44} />
      <div className="kerangka-tabel">
        {Array.from({ length: 5 }, (_, i) => <Blok key={i} tinggi={48} />)}
      </div>
    </Kerangka>
  )
}
