export const runtime = 'nodejs'

const BATAS_BYTE = 4096

/** Menerima laporan pelanggaran CSP dari peramban dan mencatatnya ke log server (dipotong agar tidak membanjiri log). */
export async function POST(req: Request) {
  const teks = (await req.text().catch(() => '')).slice(0, BATAS_BYTE)
  if (teks) console.warn('pelanggaran CSP', teks)
  return new Response(null, { status: 204 })
}
