import { z } from 'zod'

export const STATUS_DOKUMEN = ['BELUM', 'MENUNGGU', 'SAH', 'DITOLAK'] as const
export type StatusDokumen = (typeof STATUS_DOKUMEN)[number]
export const skemaStatusDokumen = z.enum(STATUS_DOKUMEN)
