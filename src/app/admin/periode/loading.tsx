import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={30} lebar={180} />
      <Blok tinggi={44} lebar={160} />
      <div className="kerangka-tabel">
        {Array.from({ length: 5 }, (_, i) => <Blok key={i} tinggi={52} />)}
      </div>
    </Kerangka>
  )
}
