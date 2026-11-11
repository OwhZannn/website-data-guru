// Membuat PDF buku panduan dari halaman /panduan/cetak.
//   npm run panduan:pdf                       (menjalankan `next dev` sendiri di port 3210, lalu mematikannya)
//   node scripts/panduan-pdf.mjs --url http://localhost:3000   (memakai server yang sudah berjalan)
// Keluaran: public/panduan/Panduan-Penggunaan-Verval-Sertifikasi-Guru.pdf (dilacak git supaya ikut terpasang di image).
import { spawn } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const akar = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NAMA = 'Panduan-Penggunaan-Verval-Sertifikasi-Guru.pdf'
const keluaran = resolve(akar, 'public', 'panduan', NAMA)
const argumen = process.argv.slice(2)
const urlDiberi = argumen.includes('--url') ? argumen[argumen.indexOf('--url') + 1] : null
const PORT = 3210

async function tunggu(url, batasMs = 120_000) {
  const mulai = Date.now()
  while (Date.now() - mulai < batasMs) {
    try { if ((await fetch(url)).ok) return } catch { /* belum siap */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Server tidak siap dalam ${batasMs / 1000} detik: ${url}`)
}

let server = null
const dasar = urlDiberi ?? `http://localhost:${PORT}`
try {
  if (!urlDiberi) {
    server = spawn('npx', ['next', 'dev', '-p', String(PORT)], { cwd: akar, stdio: 'ignore', env: { ...process.env, NODE_ENV: 'development' } })
    server.on('exit', (kode) => { if (kode) console.error(`next dev berhenti dengan kode ${kode}`) })
  }
  await tunggu(`${dasar}/panduan/cetak`)

  const peramban = await chromium.launch()
  try {
    const halaman = await (await peramban.newContext({ colorScheme: 'light', viewport: { width: 1100, height: 1400 } })).newPage()
    await halaman.goto(`${dasar}/panduan/cetak`, { waitUntil: 'networkidle' })
    // Gambar malas-muat harus sudah selesai diunduh sebelum dicetak.
    await halaman.evaluate(() => Promise.all([...document.images].map((g) => {
      g.loading = 'eager'
      return g.complete ? null : new Promise((r) => { g.onload = g.onerror = r })
    })))
    await halaman.evaluate(() => document.fonts.ready)
    await halaman.emulateMedia({ media: 'print', colorScheme: 'light' })
    mkdirSync(dirname(keluaran), { recursive: true })
    await halaman.pdf({
      path: keluaran,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:8px;color:#5b6b62;padding:0 16mm;display:flex;justify-content:space-between;font-family:sans-serif">
        <span>Buku Panduan · Verval Sertifikasi Guru</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    })
  } finally {
    await peramban.close()
  }
  const mb = (statSync(keluaran).size / 1024 / 1024).toFixed(2)
  console.log(`PDF dibuat: ${keluaran} (${mb} MB)`)
} finally {
  if (server) server.kill('SIGTERM')
}
