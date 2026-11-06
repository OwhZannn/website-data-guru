import { z } from 'zod'
import { prisma } from '@/lib/db'
import { catatRiwayat } from '@/lib/riwayat'
import { GalatPengguna } from '@/lib/galat'
import { KODE_JABATAN, KODE_PEGAWAI, LABEL_JABATAN, LABEL_PEGAWAI, TUGAS, type KunciTugas } from '@/lib/syarat'
import type { Guru, Prisma } from '@prisma/client'

const tahunIni = () => new Date().getFullYear()

export const skemaProfil = z.object({
  asalSekolah: z.string().trim().min(1, 'Asal sekolah wajib diisi').max(200, 'Asal sekolah maksimal 200 karakter'),
  statusPegawai: z.enum(KODE_PEGAWAI, { message: 'Pilih status kepegawaian' }),
  jabatan: z.enum(KODE_JABATAN, { message: 'Pilih jabatan' }).default('GURU'),
  tahunSertifikasi: z.coerce.number({ message: 'Tahun sertifikasi harus berupa angka' })
    .int('Tahun sertifikasi harus berupa angka')
    .min(1990, 'Tahun sertifikasi tidak masuk akal')
    .refine((t) => t <= tahunIni() + 1, 'Tahun sertifikasi tidak masuk akal'),
  sertifikasiBaru: z.boolean().default(false),
})
export type MasukanProfil = z.infer<typeof skemaProfil>

/** Tugas tambahan: semua kunci opsional, yang tidak dikirim tidak diubah. */
export const skemaTugas = z.object(
  Object.fromEntries(TUGAS.map(([k]) => [k, z.boolean().optional()])) as Record<KunciTugas, z.ZodOptional<z.ZodBoolean>>,
).strict()

function baca<T>(skema: z.ZodType<T>, data: unknown, cadangan: string): T {
  const h = skema.safeParse(data)
  if (!h.success) throw new GalatPengguna(h.error.issues[0]?.message ?? cadangan)
  return h.data
}
export const bacaProfil = (data: unknown) => baca(skemaProfil, data, 'Isian profil tidak sah')

const ya = (b: boolean) => (b ? 'ya' : 'tidak')

function ringkasProfil(lama: Guru, baru: MasukanProfil): string[] {
  const ubah: string[] = []
  if ((lama.asalSekolah ?? '') !== baru.asalSekolah) ubah.push(`asal sekolah: ${lama.asalSekolah ?? '-'} → ${baru.asalSekolah}`)
  if (lama.statusPegawai !== baru.statusPegawai) {
    ubah.push(`status kepegawaian: ${LABEL_PEGAWAI[lama.statusPegawai ?? ''] ?? '-'} → ${LABEL_PEGAWAI[baru.statusPegawai]}`)
  }
  if (lama.jabatan !== baru.jabatan) ubah.push(`jabatan: ${LABEL_JABATAN[lama.jabatan] ?? lama.jabatan} → ${LABEL_JABATAN[baru.jabatan]}`)
  if (lama.tahunSertifikasi !== baru.tahunSertifikasi) ubah.push(`tahun sertifikasi: ${lama.tahunSertifikasi ?? '-'} → ${baru.tahunSertifikasi}`)
  if (lama.sertifikasiBaru !== baru.sertifikasiBaru) ubah.push(`sertifikasi baru: ${ya(lama.sertifikasiBaru)} → ${ya(baru.sertifikasiBaru)}`)
  return ubah
}

/**
 * Simpan perubahan guru lalu catat ringkasannya di riwayat periode yang sedang dibuka (atau yang terbaru);
 * bila belum ada periode sama sekali, perubahan tetap tersimpan tanpa catatan.
 */
async function simpanDenganRiwayat(
  m: { guruId: string; oleh: string; olehTipe: 'guru' | 'admin' },
  hitung: (lama: Guru) => { data: Prisma.GuruUpdateInput; ubah: string[] },
) {
  return prisma.$transaction(async (tx) => {
    const lama = await tx.guru.findUnique({ where: { id: m.guruId } })
    if (!lama) throw new GalatPengguna('Guru tidak ditemukan')
    const { data, ubah } = hitung(lama)
    if (ubah.length === 0) return { berubah: false }
    await tx.guru.update({ where: { id: m.guruId }, data })
    const periode =
      (await tx.periode.findFirst({ where: { dibuka: true } })) ??
      (await tx.periode.findFirst({ orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }] }))
    if (periode) {
      await catatRiwayat(
        { periodeId: periode.id, guruId: m.guruId, aksi: 'ubah_profil', alasan: ubah.join('; '), oleh: m.oleh, olehTipe: m.olehTipe },
        tx,
      )
    }
    return { berubah: true }
  })
}

export async function simpanProfil(m: { guruId: string; data: unknown; oleh: string; olehTipe: 'guru' | 'admin' }) {
  const baru = bacaProfil(m.data)
  return simpanDenganRiwayat(m, (lama) => ({ data: baru, ubah: ringkasProfil(lama, baru) }))
}

/** Centang atau hapus centang tugas tambahan; tugas yang tidak dikirim dibiarkan. */
export async function simpanTugas(m: { guruId: string; data: unknown; oleh: string; olehTipe: 'guru' | 'admin' }) {
  const baru = baca(skemaTugas, m.data, 'Isian tugas tambahan tidak sah')
  return simpanDenganRiwayat(m, (lama) => {
    const data: Partial<Record<KunciTugas, boolean>> = {}
    const ubah: string[] = []
    for (const [k, label] of TUGAS) {
      const v = baru[k]
      if (v === undefined || v === lama[k]) continue
      data[k] = v
      ubah.push(`${label}: ${ya(lama[k])} → ${ya(v)}`)
    }
    return { data, ubah }
  })
}
