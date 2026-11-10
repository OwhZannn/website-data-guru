import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Tautan from '@/components/ui/Tautan'
import { ambilBagian, sebelumDanSesudah, SEMUA_BAGIAN } from '../konten'

export async function generateStaticParams() {
  return SEMUA_BAGIAN.map((b) => ({ slug: b.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const b = ambilBagian(slug)
  if (!b) return { title: 'Panduan penggunaan · Verval Sertifikasi Guru' }
  return {
    title: `${b.kode} · ${b.judul} — Panduan Verval Guru`,
    description: b.ringkasan,
  }
}

export default async function BagianPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bagian = ambilBagian(slug)
  if (!bagian) notFound()

  const { sebelumnya, berikutnya } = sebelumDanSesudah(slug)

  return (
    <article className="panduan-halaman-bagian">
      <nav className="panduan-eyebrow" aria-label="Breadcrumb panduan">
        <Tautan href="/panduan">Panduan</Tautan>
        <span aria-hidden="true" className="panduan-eyebrow__pemisah">/</span>
        <span>{bagian.kategori}</span>
      </nav>

      <h1 className="panduan-judul">
        <span className="panduan-kode-tag">{bagian.kode}</span>
        {bagian.judul}
      </h1>
      <p className="panduan-ringkas-lede">{bagian.ringkasan}</p>

      <div className="panduan-isi-artikel">
        {bagian.konten}
      </div>

      <nav className="panduan-nav-bawah" aria-label="Navigasi panduan">
        {sebelumnya ? (
          <Tautan href={`/panduan/${sebelumnya.id}`} className="panduan-nav-link panduan-nav-link--sebelum">
            <span className="panduan-nav-link__label">‹ Sebelumnya</span>
            <span className="panduan-nav-link__judul">{sebelumnya.kode} · {sebelumnya.judul}</span>
          </Tautan>
        ) : <div />}

        {berikutnya ? (
          <Tautan href={`/panduan/${berikutnya.id}`} className="panduan-nav-link panduan-nav-link--berikut">
            <span className="panduan-nav-link__label">Berikutnya ›</span>
            <span className="panduan-nav-link__judul">{berikutnya.kode} · {berikutnya.judul}</span>
          </Tautan>
        ) : <div />}
      </nav>
    </article>
  )
}
