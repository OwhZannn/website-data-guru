import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={16} lebar={240} />
      <Blok tinggi={30} lebar={180} />
      <div className="kerangka-tabel">
        {Array.from({ length: 5 }, (_, i) => <Blok key={i} tinggi={44} />)}
      </div>
      <Blok tinggi={44} lebar={140} />
    </Kerangka>
  )
}
