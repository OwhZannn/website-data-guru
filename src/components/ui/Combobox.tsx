'use client'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useTerpasang } from '@/lib/terpasang'
import {
  type ButirCombobox,
  type MasukanOpsi,
  normalisasiOpsi,
  normalisasiTeks,
  cocokTeks,
} from '@/lib/combobox'

export type { ButirCombobox, MasukanOpsi }
export { normalisasiOpsi, normalisasiTeks, cocokTeks }

export function sorotKarakter(teks: string, kueri: string): ReactNode {
  if (!kueri.trim()) return teks
  const sNorm = normalisasiTeks(teks)
  const kNorm = normalisasiTeks(kueri)
  const idx = sNorm.indexOf(kNorm)
  if (idx === -1) return teks

  const awal = teks.slice(0, idx)
  const cocok = teks.slice(idx, idx + kueri.length)
  const akhir = teks.slice(idx + kueri.length)

  return (
    <>
      {awal}
      <mark className="combobox-sorot">{cocok}</mark>
      {sorotKarakter(akhir, kueri)}
    </>
  )
}

export default function Combobox({
  name,
  defaultValue = '',
  opsi,
  placeholder,
  kosongLabel,
  ariaLabel,
  className = '',
  onChange,
  disabled = false,
}: {
  name: string
  defaultValue?: string
  opsi: readonly MasukanOpsi[]
  placeholder?: string
  kosongLabel?: string
  ariaLabel?: string
  className?: string
  onChange?: (nilai: string) => void
  disabled?: boolean
}) {
  const terpasang = useTerpasang()
  const daftarOpsi = normalisasiOpsi(opsi)

  const opsiLengkap: ButirCombobox[] = kosongLabel
    ? [{ nilai: '', label: kosongLabel }, ...daftarOpsi]
    : daftarOpsi

  const [nilai, setNilai] = useState(defaultValue)
  const [buka, setBuka] = useState(false)
  const [kueri, setKueri] = useState(() => {
    const awal = opsiLengkap.find((o) => o.nilai === defaultValue)
    return awal ? awal.label : ''
  })
  const [sorotIdx, setSorotIdx] = useState<number>(-1)
  const [arahAtas, setArahAtas] = useState(false)

  const wadahRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  const idAcak = useId()
  const idInput = `combobox-input-${idAcak}`
  const idListbox = `combobox-listbox-${idAcak}`

  const labelTerpilih = opsiLengkap.find((o) => o.nilai === nilai)?.label ?? ''
  const placeholderTeks = labelTerpilih || placeholder || kosongLabel || 'Pilih…'

  // Saring opsi berdasarkan ketikan saat popup terbuka
  const opsiTersaring = opsiLengkap.filter((o) => {
    return cocokTeks(o.label, kueri)
  })

  // Sinkronisasi saat defaultValue dari luar berubah
  useEffect(() => {
    setNilai(defaultValue)
    const cocok = opsiLengkap.find((o) => o.nilai === defaultValue)
    setKueri(cocok ? cocok.label : '')
  }, [defaultValue])

  // Hitung posisi buka (ke bawah atau ke atas jika mentok)
  useEffect(() => {
    if (!buka || !wadahRef.current) return
    const rect = wadahRef.current.getBoundingClientRect()
    const sisaBawah = window.innerHeight - rect.bottom
    setArahAtas(sisaBawah < 260 && rect.top > 260)
  }, [buka])

  // Tutup saat klik di luar dan kembalikan nilai terpilih
  useEffect(() => {
    if (!buka) return
    function klikLuar(e: MouseEvent) {
      if (wadahRef.current && !wadahRef.current.contains(e.target as Node)) {
        setBuka(false)
        setKueri(labelTerpilih)
      }
    }
    document.addEventListener('mousedown', klikLuar)
    return () => document.removeEventListener('mousedown', klikLuar)
  }, [buka, labelTerpilih])

  function bukaDanKosongkan() {
    if (!buka) {
      setBuka(true)
      setKueri('')
      setSorotIdx(-1)
    }
  }

  function pilihOpsi(o: ButirCombobox) {
    if (o.nonaktif) return
    setNilai(o.nilai)
    setKueri(o.label)
    setBuka(false)
    setSorotIdx(-1)

    // Trigger change event pada native select agar FormOtomatis langsung menyaring
    if (selectRef.current) {
      selectRef.current.value = o.nilai
      selectRef.current.dispatchEvent(new Event('change', { bubbles: true }))
    }
    if (onChange) onChange(o.nilai)
  }

  function tanganiKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        if (!buka) {
          setBuka(true)
          setKueri('')
          setSorotIdx(0)
        } else {
          setSorotIdx((prev) => {
            const next = prev < opsiTersaring.length - 1 ? prev + 1 : 0
            gulirKeOpsi(next)
            return next
          })
        }
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        if (!buka) {
          setBuka(true)
          setKueri('')
          setSorotIdx(opsiTersaring.length - 1)
        } else {
          setSorotIdx((prev) => {
            const next = prev > 0 ? prev - 1 : opsiTersaring.length - 1
            gulirKeOpsi(next)
            return next
          })
        }
        break
      }
      case 'Enter': {
        if (buka && sorotIdx >= 0 && sorotIdx < opsiTersaring.length) {
          e.preventDefault()
          pilihOpsi(opsiTersaring[sorotIdx])
        }
        break
      }
      case 'Escape': {
        if (buka) {
          e.preventDefault()
          setBuka(false)
          setKueri(labelTerpilih)
        }
        break
      }
      case 'Home': {
        if (buka) {
          e.preventDefault()
          setSorotIdx(0)
          gulirKeOpsi(0)
        }
        break
      }
      case 'End': {
        if (buka) {
          e.preventDefault()
          const akhir = opsiTersaring.length - 1
          setSorotIdx(akhir)
          gulirKeOpsi(akhir)
        }
        break
      }
      case 'Tab': {
        setBuka(false)
        setKueri(labelTerpilih)
        break
      }
    }
  }

  function gulirKeOpsi(idx: number) {
    if (!listboxRef.current) return
    const el = listboxRef.current.children[idx] as HTMLElement | undefined
    if (el) el.scrollIntoView({ block: 'nearest' })
  }

  return (
    <div
      ref={wadahRef}
      className={`combobox-wrap ${className}`}
      data-buka={buka}
    >
      {/* Fallback untuk no-js dan penyerahan native form */}
      <select
        ref={selectRef}
        name={name}
        aria-label={terpasang ? undefined : ariaLabel}
        className={terpasang ? 'combobox-select-asli' : className}
        value={nilai}
        disabled={disabled}
        onChange={(e) => {
          const val = e.target.value
          setNilai(val)
          const cocok = opsiLengkap.find((o) => o.nilai === val)
          setKueri(cocok ? cocok.label : '')
          if (onChange) onChange(val)
        }}
        tabIndex={terpasang ? -1 : 0}
        aria-hidden={terpasang ? 'true' : undefined}
      >
        {opsiLengkap.map((o) => (
          <option key={o.nilai} value={o.nilai} disabled={o.nonaktif}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Input interaktif combobox */}
      {terpasang && (
        <div className="combobox-input-wrap">
          <input
            ref={inputRef}
            id={idInput}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={buka}
            aria-haspopup="listbox"
            aria-controls={idListbox}
            aria-activedescendant={
              buka && sorotIdx >= 0 ? `${idListbox}-opsi-${sorotIdx}` : undefined
            }
            aria-label={ariaLabel}
            value={buka ? kueri : labelTerpilih}
            disabled={disabled}
            placeholder={placeholderTeks}
            className="combobox-input"
            autoComplete="off"
            spellCheck={false}
            onClick={bukaDanKosongkan}
            onFocus={bukaDanKosongkan}
            onChange={(e) => {
              setKueri(e.target.value)
              if (!buka) setBuka(true)
              setSorotIdx(0)
            }}
            onKeyDown={tanganiKeyDown}
          />

          <span className="combobox-ikon" aria-hidden="true">
            <ChevronDown size={16} strokeWidth={2} />
          </span>

          {/* Pengumuman pembaca layar */}
          <span className="sr-only" role="status" aria-live="polite">
            {buka
              ? opsiTersaring.length > 0
                ? `${opsiTersaring.length} opsi tersedia.`
                : 'Tidak ada yang cocok.'
              : ''}
          </span>

          {/* Popup daftar opsi */}
          {buka && (
            <ul
              ref={listboxRef}
              id={idListbox}
              role="listbox"
              aria-label={ariaLabel ?? 'Pilihan'}
              className={`combobox-popup ${arahAtas ? 'combobox-popup--atas' : 'combobox-popup--bawah'}`}
            >
              {opsiTersaring.length === 0 ? (
                <li className="combobox-kosong">Tidak ada yang cocok</li>
              ) : (
                opsiTersaring.map((o, idx) => {
                  const terpilih = o.nilai === nilai
                  const disorot = idx === sorotIdx
                  return (
                    <li
                      key={o.nilai || `kosong-${idx}`}
                      id={`${idListbox}-opsi-${idx}`}
                      role="option"
                      aria-selected={terpilih}
                      aria-disabled={o.nonaktif}
                      className={`combobox-opsi${disorot ? ' sorot' : ''}`}
                      onMouseEnter={() => setSorotIdx(idx)}
                      onClick={() => pilihOpsi(o)}
                    >
                      <span>{sorotKarakter(o.label, kueri)}</span>
                      {terpilih && (
                        <Check size={14} strokeWidth={2.5} className="combobox-ceklis" aria-hidden="true" />
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
