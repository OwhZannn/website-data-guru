import Kerangka, { Blok } from '@/components/ui/Kerangka'

export default function Memuat() {
  return (
    <Kerangka>
      <Blok tinggi={16} lebar={240} />
      <Blok tinggi={30} lebar={180} />
      <Blok tinggi={160} />
      <Blok tinggi={44} lebar={140} />
    </Kerangka>
  )
}
