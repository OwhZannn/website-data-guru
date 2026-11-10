'use client'
import { useEffect, useRef, useState } from 'react'
import { UserCog, X } from 'lucide-react'
import type { Guru } from '@prisma/client'
import { type KunciTugas } from '@/lib/syarat'
import FormProfil from './FormProfil'
import PilihTugas from './PilihTugas'

export default function ModalKoreksiProfil(p: {
  guru: Guru
  tugas: Record<KunciTugas, boolean>
}) {
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

  return (
    <>
      <button
        type="button"
        className="tombol-garis tombol-garis--sm"
        onClick={() => setBuka(true)}
        aria-haspopup="dialog"
      >
        <UserCog size={15} strokeWidth={2} aria-hidden="true" />
        <span>Koreksi profil dan tugas</span>
      </button>

      <dialog
        ref={ref}
        className="modal-profil"
        aria-labelledby="judul-modal-profil"
        onCancel={(e) => {
          e.preventDefault()
          tutup()
        }}
      >
        {buka && (
          <div className="modal-profil__konten">
            <div className="modal-profil__kepala">
              <h2 id="judul-modal-profil">Koreksi Profil dan Tugas Guru</h2>
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
              <FormProfil awal={p.guru} guruId={p.guru.id} onSelesai={tutup} />
              <div className="spacer-s4" />
              <PilihTugas awal={p.tugas} guruId={p.guru.id} />
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
