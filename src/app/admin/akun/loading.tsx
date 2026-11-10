import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={30} lebar={160} />
      <div className="kerangka-kisi kerangka-kisi--dua">
        <Blok tinggi={200} />
        <Blok tinggi={320} />
      </div>
    </Kerangka>
  )
}
