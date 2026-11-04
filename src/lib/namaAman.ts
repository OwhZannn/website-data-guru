export function amanUntukNamaFolder(nama: string): string {
  const bersih = nama
    .replace(/[\\/:*?"<>|]/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim()
  return bersih.replace(/^(- )+|( -)+$/g, '').trim() || 'Tanpa Nama'
}
