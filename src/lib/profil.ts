import { z } from 'zod'
import { prisma } from '@/lib/db'
import { catatRiwayat } from '@/lib/riwayat'
import { GalatPengguna } from '@/lib/galat'
import { pakaiNip } from '@/lib/identitas'
import { KODE_JABATAN, KODE_PEGAWAI, LABEL_JABATAN, LABEL_PEGAWAI, TUGAS, type KunciTugas } from '@/lib/syarat'
import type { Guru, Prisma } from '@prisma/client'

const tahunIni = () => new Date().getFullYear()

export const skemaProfil = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(200, 'Nama maksimal 200 karakter').optional(),
  asalSekolah: z.string().trim().min(1, 'Asal sekolah wajib diisi').max(200, 'Asal sekolah maksimal 200 karakter'),
  statusPegawai: z.enum(KODE_PEGAWAI, { message: 'Pilih status kepegawaian' }),
  jabatan: z.enum(KODE_JABATAN, { message: 'Pilih jabatan' }).default('GURU'),
  tahunSertifikasi: z.coerce.number({ message: 'Tahun sertifikasi harus berupa angka' })
    .int('Tahun sertifikasi harus berupa angka')
    .min(1990, 'Tahun sertifikasi tidak masuk akal')
    .refine((t) => t <= tahunIni() + 1, 'Tahun sertifikasi tidak masuk akal'),
  sertifikasiBaru: z.boolean().default(false),
  nip: z.string().optional().nullable(),
  nik: z.string().optional().nullable(),
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
  const masukan = bacaProfil(m.data)

  return prisma.$transaction(async (tx) => {
    const lama = await tx.guru.findUnique({ where: { id: m.guruId } })
    if (!lama) throw new GalatPengguna('Guru tidak ditemukan')

    const data: Prisma.GuruUpdateInput = {
      asalSekolah: masukan.asalSekolah,
      statusPegawai: masukan.statusPegawai,
      jabatan: masukan.jabatan,
      tahunSertifikasi: masukan.tahunSertifikasi,
      sertifikasiBaru: masukan.sertifikasiBaru,
    }
    const ubah: string[] = []

    // 1. Nama lengkap (boleh diubah guru maupun admin)
    if (masukan.nama && masukan.nama !== lama.nama) {
      data.nama = masukan.nama
      ubah.push(`nama: ${lama.nama} → ${masukan.nama}`)
    }

    // 2. NIP / NIK (hanya boleh diubah admin)
    if (m.olehTipe === 'admin') {
      const isAsn = pakaiNip(masukan.statusPegawai)
      const rawNip = masukan.nip !== undefined ? (masukan.nip ? String(masukan.nip).replace(/[\s.-]/g, '') : null) : undefined
      const rawNik = masukan.nik !== undefined ? (masukan.nik ? String(masukan.nik).replace(/[\s.-]/g, '') : null) : undefined

      if (isAsn && rawNip !== undefined) {
        if (rawNip && rawNip !== lama.nip) {
          if (!/^\d{18}$/.test(rawNip)) {
            throw new GalatPengguna('NIP harus 18 angka')
          }
          const bentrok = await tx.guru.findFirst({
            where: {
              id: { not: m.guruId },
              OR: [{ nip: rawNip }, { username: rawNip }],
            },
          })
          if (bentrok) throw new GalatPengguna('NIP ini sudah terdaftar untuk guru lain')
          data.nip = rawNip
          data.username = rawNip
          if (lama.nik !== null) data.nik = null
          ubah.push(`NIP: ${lama.nip ?? '-'} → ${rawNip}`)
        }
      } else if (!isAsn && rawNik !== undefined) {
        if (rawNik && rawNik !== lama.nik) {
          if (!/^\d{16}$/.test(rawNik)) {
            throw new GalatPengguna('NIK harus 16 angka')
          }
          const bentrok = await tx.guru.findFirst({
            where: {
              id: { not: m.guruId },
              OR: [{ nik: rawNik }, { username: rawNik }],
            },
          })
          if (bentrok) throw new GalatPengguna('NIK ini sudah terdaftar untuk guru lain')
          data.nik = rawNik
          data.username = rawNik
          if (lama.nip !== null) data.nip = null
          ubah.push(`NIK: ${lama.nik ?? '-'} → ${rawNik}`)
        }
      }
    }

    // Perubahan atribut umum lainnya
    if ((lama.asalSekolah ?? '') !== masukan.asalSekolah) {
      ubah.push(`asal sekolah: ${lama.asalSekolah ?? '-'} → ${masukan.asalSekolah}`)
    }
    if (lama.statusPegawai !== masukan.statusPegawai) {
      ubah.push(`status kepegawaian: ${LABEL_PEGAWAI[lama.statusPegawai ?? ''] ?? '-'} → ${LABEL_PEGAWAI[masukan.statusPegawai]}`)
    }
    if (lama.jabatan !== masukan.jabatan) {
      ubah.push(`jabatan: ${LABEL_JABATAN[lama.jabatan] ?? lama.jabatan} → ${LABEL_JABATAN[masukan.jabatan]}`)
    }
    if (lama.tahunSertifikasi !== masukan.tahunSertifikasi) {
      ubah.push(`tahun sertifikasi: ${lama.tahunSertifikasi ?? '-'} → ${masukan.tahunSertifikasi}`)
    }
    if (lama.sertifikasiBaru !== masukan.sertifikasiBaru) {
      ubah.push(`sertifikasi baru: ${ya(lama.sertifikasiBaru)} → ${ya(masukan.sertifikasiBaru)}`)
    }

    if (ubah.length === 0) return { berubah: false }

    // Jika username berubah, keluarkan semua sesi guru tersebut
    if (data.username && data.username !== lama.username) {
      await tx.sesi.deleteMany({ where: { pemilikId: m.guruId, tipe: 'guru' } })
    }

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
