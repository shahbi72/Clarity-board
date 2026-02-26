import { cookies } from 'next/headers'
import {
  FALLBACK_AUTH_COOKIE_NAME,
  hasFallbackSessionValue,
  isFallbackAuthEnabled,
} from '@/lib/auth/fallback-session'
import { isDatabaseConnectivityError } from '@/lib/server/database-errors'
import { prisma } from '@/lib/server/prisma'
import { HttpError } from '@/lib/server/http-error'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'

export const DEMO_USER_ID = process.env.DEMO_USER_ID?.trim() || 'demo-user'

const POSTGRES_DATABASE_URL_HELP =
  'Database configuration error. Set DATABASE_URL to your Supabase Postgres connection string (pooler 6543 + sslmode=require).'

export type CurrentUserIdentity = {
  id: string
  email: string | null
}

export async function getCurrentUserIdentity(): Promise<CurrentUserIdentity> {
  if (!isSupabaseAuthConfigured()) {
    if (!isFallbackAuthEnabled()) {
      throw new HttpError(500, 'Supabase auth configuration is required.')
    }

    const cookieStore = await cookies()
    const hasFallbackSession = hasFallbackSessionValue(
      cookieStore.get(FALLBACK_AUTH_COOKIE_NAME)?.value
    )

    if (!hasFallbackSession) {
      throw new HttpError(401, 'Authentication required.')
    }

    return {
      id: DEMO_USER_ID,
      email: 'demo@clarityboard.app',
    }
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    throw new HttpError(500, 'Authentication provider is unavailable.')
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new HttpError(401, 'Authentication required.')
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  }
}

export async function getCurrentUserId(): Promise<string> {
  const identity = await getCurrentUserIdentity()
  return identity.id
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
    const isConnectivityError = isDatabaseConnectivityError(error)

    if (isDatabaseUrlError) {
      throw new Error(POSTGRES_DATABASE_URL_HELP)
    }

    if (isConnectivityError) {
      throw new Error('Database connection unavailable. Unable to reach Postgres.')
    }

    throw new Error('Unable to initialize user data. Check database configuration and permissions.')
  }
}
