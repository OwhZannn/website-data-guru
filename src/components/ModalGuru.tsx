'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Plus, UserCog, X } from 'lucide-react'
import type { Guru } from '@prisma/client'
import { type KunciTugas } from '@/lib/syarat'
import FormProfil from './FormProfil'
import FormGuruBaru from './FormGuruBaru'
import PilihTugas from './PilihTugas'

export type ModalGuruProps =
  | {
      mode: 'tambah'
      trigger?: ReactNode
    }
  | {
      mode: 'koreksi'
      guru: Guru
      tugas: Record<KunciTugas, boolean>
      trigger?: ReactNode
    }

export default function ModalGuru(p: ModalGuruProps) {
  const [buka, setBuka] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (buka && !d.open) d.showModal()
    if (!buka && d.open) d.close()
  }, [buka])

  function tutup() {
    setBuka(false)
  }

  const judul = p.mode === 'tambah' ? 'Tambah Guru Baru' : 'Koreksi Profil dan Tugas Guru'

  return (
    <>
      {p.trigger ? (
        <span
          onClick={() => setBuka(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setBuka(true)}
        >
          {p.trigger}
        </span>
      ) : p.mode === 'tambah' ? (
        <button
          type="button"
          className="tombol"
          onClick={() => setBuka(true)}
          aria-haspopup="dialog"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          <span>Tambah guru</span>
        </button>
      ) : (
        <button
          type="button"
          className="tombol-garis tombol-garis--sm"
          onClick={() => setBuka(true)}
          aria-haspopup="dialog"
        >
          <UserCog size={15} strokeWidth={2} aria-hidden="true" />
          <span>Koreksi profil dan tugas</span>
        </button>
      )}

      <dialog
        ref={ref}
        className="modal-profil"
        aria-labelledby="judul-modal-guru"
        onCancel={(e) => {
          e.preventDefault()
          tutup()
        }}
      >
        {buka && (
          <div className="modal-profil__konten">
            <div className="modal-profil__kepala">
              <h2 id="judul-modal-guru">{judul}</h2>
              <button
                type="button"
                className="biasa modal-profil__tutup"
                onClick={tutup}
                aria-label="Tutup modal"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="modal-profil__isi">
              {p.mode === 'tambah' ? (
                <FormGuruBaru mode="admin" onSelesai={tutup} />
              ) : (
                <FormProfil
                  awal={p.guru}
                  guruId={p.guru.id}
                  onSelesai={tutup}
                  anak={<PilihTugas awal={p.tugas} guruId={p.guru.id} />}
                />
              )}
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}

/** Alias untuk keterbacaan kode pemanggil */
export function ModalKoreksiProfil(p: { guru: Guru; tugas: Record<KunciTugas, boolean> }) {
  return <ModalGuru mode="koreksi" guru={p.guru} tugas={p.tugas} />
}

export function ModalTambahGuru() {
  return <ModalGuru mode="tambah" />
}
