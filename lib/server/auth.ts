import { prisma } from '@/lib/server/prisma'
import { HttpError } from '@/lib/server/http-error'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'

export const DEMO_USER_ID = process.env.DEMO_USER_ID?.trim() || 'demo-user'

const POSTGRES_DATABASE_URL_HELP =
  'Database configuration error. Set DATABASE_URL to your Supabase Postgres connection string (pooler 6543 + sslmode=require).'

export async function getCurrentUserId(): Promise<string> {
  if (!isSupabaseAuthConfigured()) {
    return DEMO_USER_ID
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    return DEMO_USER_ID
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new HttpError(401, 'Authentication required.')
  }

  return data.user.id
}

export async function ensureCurrentUser(userId: string) {
  const defaultName = userId === DEMO_USER_ID ? 'Demo User' : 'Clarityboard User'

  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, name: defaultName },
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
