import { PrismaClient } from '@prisma/client'

const globalUntukPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalUntukPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalUntukPrisma.prisma = prisma
