import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={16} lebar={260} />
      <Blok tinggi={30} lebar={220} />
      <div className="kerangka-tabel">
        {Array.from({ length: 6 }, (_, i) => <Blok key={i} tinggi={52} />)}
      </div>
    </Kerangka>
  )
}
