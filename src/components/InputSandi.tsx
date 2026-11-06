'use client'
import { useState, type InputHTMLAttributes } from 'react'

/** Kolom kata sandi dengan tombol mata untuk menampilkan atau menyembunyikan isinya. */
export default function InputSandi(p: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [lihat, setLihat] = useState(false)
  return (
    <span className="sandi-bungkus">
      <input {...p} type={lihat ? 'text' : 'password'} />
      <button
        type="button"
        className="sandi-mata"
        onClick={() => setLihat((v) => !v)}
        aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={lihat}
        title={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
      >
        {lihat ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" /><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
            <path d="M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  )
}
