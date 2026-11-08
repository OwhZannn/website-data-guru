import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={30} lebar={220} />
      <div className="kerangka-kisi kerangka-kisi--stat">
        {Array.from({ length: 5 }, (_, i) => <Blok key={i} tinggi={86} />)}
      </div>
      <Blok tinggi={14} />
      <div className="kerangka-kisi kerangka-kisi--dua">
        <Blok tinggi={260} />
        <Blok tinggi={260} />
      </div>
    </Kerangka>
  )
}
