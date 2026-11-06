import { redirect } from 'next/navigation'

// Ganti kata sandi kini ada di halaman Profil; alamat lama tetap berfungsi.
export default function GantiSandi() {
  redirect('/profil#sandi')
}
