import { PrismaClient } from '@prisma/client'

const SQLITE_FALLBACK_DATABASE_URL = 'file:./dev.db'

const configuredDatabaseUrl = process.env.DATABASE_URL?.trim()
if (!configuredDatabaseUrl || !configuredDatabaseUrl.startsWith('file:')) {
  process.env.DATABASE_URL = SQLITE_FALLBACK_DATABASE_URL
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      `[prisma] DATABASE_URL is missing or not a SQLite file URL. Falling back to ${SQLITE_FALLBACK_DATABASE_URL}.`
    )
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
