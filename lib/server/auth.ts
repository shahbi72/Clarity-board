import { prisma } from '@/lib/server/prisma'

export const DEMO_USER_ID = process.env.DEMO_USER_ID?.trim() || 'demo-user'

const POSTGRES_DATABASE_URL_HELP =
  'Database configuration error. Set DATABASE_URL to your Supabase Postgres connection string (pooler 6543 + sslmode=require).'

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
    const isDatabaseUrlError =
      normalizedMessage.includes('datasource') &&
      normalizedMessage.includes('url')

    if (isDatabaseUrlError) {
      throw new Error(POSTGRES_DATABASE_URL_HELP)
    }

    throw new Error('Unable to initialize user data. Check database configuration and permissions.')
  }
}
