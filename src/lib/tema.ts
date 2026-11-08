export type Tema = 'terang' | 'gelap' | 'sistem'

export const KUNCI_TEMA = 'tema'
export const PILIHAN_TEMA: { nilai: Tema; teks: string }[] = [
  { nilai: 'terang', teks: 'Terang' },
  { nilai: 'gelap', teks: 'Gelap' },
  { nilai: 'sistem', teks: 'Sistem' },
]

export const KUNCI_LIPAT = 'admin-sidebar-collapsed'

/**
 * Skrip kecil yang dijalankan di <head> sebelum halaman digambar: memasang tema pilihan dan status
 * sidebar terlipat supaya tidak ada kilatan tema salah atau sidebar yang bergerak saat dimuat.
 * Isinya harus berdiri sendiri (tanpa impor) karena disisipkan sebagai teks.
 */
export const SKRIP_AWAL = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('${KUNCI_TEMA}');if(t==='terang'||t==='gelap'){d.setAttribute('data-tema',t);var w=t==='gelap'?'#16241c':'#ffffff';document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.setAttribute('content',w);m.removeAttribute('media')})}if(localStorage.getItem('${KUNCI_LIPAT}')==='1')d.setAttribute('data-sidebar','lipat')}catch(e){}})()`

export function bacaTema(): Tema {
  try {
    const t = localStorage.getItem(KUNCI_TEMA)
    return t === 'terang' || t === 'gelap' ? t : 'sistem'
  } catch {
    return 'sistem'
  }
}

/** Memasang dan menyimpan pilihan. "Sistem" menghapus atribut dan simpanan sehingga mengikuti perangkat. */
export function pasangTema(tema: Tema) {
  const el = document.documentElement
  // Kelas sementara menyalakan transisi warna hanya saat tema diganti, bukan pada hover biasa.
  el.classList.add('tema-berubah')
  window.setTimeout(() => el.classList.remove('tema-berubah'), 400)
  try {
    if (tema === 'sistem') localStorage.removeItem(KUNCI_TEMA)
    else localStorage.setItem(KUNCI_TEMA, tema)
  } catch {}
  if (tema === 'sistem') el.removeAttribute('data-tema')
  else el.setAttribute('data-tema', tema)
}
