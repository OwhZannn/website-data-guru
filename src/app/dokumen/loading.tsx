import Kerangka, { Blok } from '@/components/ui/Kerangka'

// Kepala guru dirender oleh halaman, jadi kerangka berdiri sendiri di dalam <main>.
export default function Memuat() {
  return (
    <main>
      <Kerangka>
        <Blok tinggi={30} lebar={180} />
        <Blok tinggi={108} />
        <Blok tinggi={90} />
        {Array.from({ length: 4 }, (_, i) => <Blok key={i} tinggi={110} />)}
      </Kerangka>
    </main>
  )
}
