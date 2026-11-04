export function amanUntukNamaFolder(nama: string): string {
  const bersih = nama
    .replace(/[\\/:*?"<>|]/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
  const bersih2 = Array.from(bersih).slice(0, 100).join('').trim()
  return bersih2.replace(/^(- )+|( -)+$/g, '').trim() || 'Tanpa Nama'
}
