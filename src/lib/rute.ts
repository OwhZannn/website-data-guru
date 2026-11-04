import { GalatPengguna } from '@/lib/galat'

export const gagal = (pesan: string) => Response.json({ ok: false, pesan }, { status: 400 })
export const galatUmum = (e: unknown, konteks: string) => {
  if (e instanceof Response) return e
  if (e instanceof GalatPengguna) return gagal(e.message)
  console.error(konteks, e)
  return Response.json({ ok: false, pesan: 'Terjadi kesalahan. Silakan coba lagi.' }, { status: 500 })
}
