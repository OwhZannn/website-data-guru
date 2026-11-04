import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const PANJANG_KUNCI = 64

function turunkan(sandi: string, garam: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(sandi, garam, PANJANG_KUNCI, (err, kunci) => (err ? reject(err) : resolve(kunci))),
  )
}

export async function hashSandi(sandi: string): Promise<string> {
  const garam = randomBytes(16)
  const turunan = await turunkan(sandi, garam)
  return `scrypt$${garam.toString('hex')}$${turunan.toString('hex')}`
}

export async function periksaSandi(sandi: string, hash: string): Promise<boolean> {
  const [skema, garamHex, turunanHex] = hash.split('$')
  if (skema !== 'scrypt' || !garamHex || !turunanHex) return false
  const diharapkan = Buffer.from(turunanHex, 'hex')
  const aktual = await turunkan(sandi, Buffer.from(garamHex, 'hex'))
  return diharapkan.length === aktual.length && timingSafeEqual(diharapkan, aktual)
}
