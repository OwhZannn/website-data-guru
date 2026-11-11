export type ButirCombobox = {
  nilai: string
  label: string
  nonaktif?: boolean
}

export type MasukanOpsi = string | readonly [string, string] | [string, string] | ButirCombobox

export function normalisasiOpsi(daftar: readonly MasukanOpsi[]): ButirCombobox[] {
  return daftar.map((item) => {
    if (typeof item === 'string') {
      return { nilai: item, label: item }
    }
    if (Array.isArray(item)) {
      return { nilai: item[0], label: item[1] }
    }
    return item as ButirCombobox
  })
}

export function normalisasiTeks(teks: string): string {
  return teks
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function cocokTeks(sumber: string, kueri: string): boolean {
  if (!kueri) return true
  const s = normalisasiTeks(sumber)
  const k = normalisasiTeks(kueri)
  return s.includes(k)
}
