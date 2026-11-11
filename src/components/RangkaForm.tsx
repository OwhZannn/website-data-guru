'use client'
import type { FormEvent, ReactNode, Ref } from 'react'
import { useTerpasang } from '@/lib/terpasang'

/**
 * Rangka formulir guru. Di dalam modal: badan bergulir, kaki tetap dengan tombol kirim di kanan.
 * Di halaman biasa: tombol kirim di bawah isian. Dipakai bersama oleh formulir Tambah guru dan Koreksi profil.
 */
export default function RangkaForm(p: {
  dalamModal: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  labelKirim: string
  labelSibuk?: string
  sibuk: boolean
  pesan?: string
  sukses?: string
  /** Konten tambahan di atas isian (mis. banner akun baru) yang ikut bergulir di dalam modal. */
  atas?: ReactNode
  badanRef?: Ref<HTMLDivElement>
  children: ReactNode
}) {
  const terpasang = useTerpasang()
  const tombol = (
    <button type="submit" className="tombol" disabled={p.sibuk || !terpasang}>
      {p.sibuk ? (p.labelSibuk ?? 'Menyimpan…') : p.labelKirim}
    </button>
  )

  if (!p.dalamModal) {
    return (
      <form method="post" onSubmit={p.onSubmit} className="panel profil">
        {p.children}
        {p.pesan && <p className="galat" role="alert">{p.pesan}</p>}
        <div className="aksi">
          {tombol}
          {p.sukses && <span className="ok" role="status">{p.sukses}</span>}
        </div>
      </form>
    )
  }

  return (
    <form method="post" onSubmit={p.onSubmit} className="panel profil modal-profil__form">
      <div className="modal-profil__badan" ref={p.badanRef}>
        {p.atas}
        {p.children}
        {p.pesan && <p className="galat" role="alert">{p.pesan}</p>}
      </div>
      <div className="modal-profil__kaki">{tombol}</div>
    </form>
  )
}
