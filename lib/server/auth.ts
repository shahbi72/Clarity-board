import { prisma } from '@/lib/server/prisma'

export const DEMO_USER_ID = process.env.DEMO_USER_ID?.trim() || 'demo-user'

const SQLITE_DATABASE_URL_HELP = 'Set DATABASE_URL="file:./dev.db" for SQLite deployments.'

export async function getCurrentUserId(): Promise<string> {
  return DEMO_USER_ID
}

export async function ensureCurrentUser(userId: string) {
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: 'Demo User' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const normalizedMessage = message.toLowerCase()
    const isSqliteUrlError =
      normalizedMessage.includes('datasource') &&
      normalizedMessage.includes('url') &&
      normalizedMessage.includes('file:')

    if (isSqliteUrlError) {
      throw new Error(`Database configuration error. ${SQLITE_DATABASE_URL_HELP}`)
    }

    throw new Error('Unable to initialize user data. Check database configuration and permissions.')
  }
}
