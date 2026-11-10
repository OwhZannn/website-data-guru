import Kerangka, { Blok } from '@/components/ui/Kerangka'

// Kepala guru dirender oleh halaman, jadi kerangka berdiri sendiri di dalam <main>.
export default function Memuat() {
  return (
    <main className="profil-halaman">
      <Kerangka>
        <Blok tinggi={30} lebar={180} />
        <Blok tinggi={20} lebar="60%" />
        <Blok tinggi={320} />
        <Blok tinggi={220} />
      </Kerangka>
    </main>
  )
}
