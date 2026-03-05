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

type GetCurrentUserOptions = {
  requireAuth?: boolean
}

function getDemoIdentity(): CurrentUserIdentity {
  return {
    id: DEMO_USER_ID,
    email: 'demo@clarityboard.app',
  }
}

export async function getCurrentUserIdentity(
  options: GetCurrentUserOptions = {}
): Promise<CurrentUserIdentity> {
  const requireAuth = options.requireAuth ?? true

  if (!isSupabaseAuthConfigured()) {
    if (!isFallbackAuthEnabled()) {
      if (requireAuth) {
        throw new HttpError(500, 'Supabase auth configuration is required.')
      }
      return getDemoIdentity()
    }

    const cookieStore = await cookies()
    const hasFallbackSession = hasFallbackSessionValue(
      cookieStore.get(FALLBACK_AUTH_COOKIE_NAME)?.value
    )

    if (!hasFallbackSession && requireAuth) {
      throw new HttpError(401, 'Authentication required.')
    }

    return getDemoIdentity()
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    if (requireAuth) {
      throw new HttpError(500, 'Authentication provider is unavailable.')
    }
    return getDemoIdentity()
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    if (requireAuth) {
      throw new HttpError(401, 'Authentication required.')
    }
    return getDemoIdentity()
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  }
}

export async function getCurrentUserId(options: GetCurrentUserOptions = {}): Promise<string> {
  const identity = await getCurrentUserIdentity(options)
  return identity.id
}

export async function ensureCurrentUser(userId: string) {
  const defaultName = userId === DEMO_USER_ID ? 'Demo User' : 'Clarityboard User'
  const userLookupQuery = 'prisma.user.findUnique({ where: { id } })'

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (existingUser) {
      return
    }
  } catch (error) {
    throw mapEnsureCurrentUserError(error, {
      conditionFailed: 'user_lookup_failed',
      nullOrEmptyQuery: null,
    })
  }

  try {
    await prisma.user.create({
      data: { id: userId, name: defaultName },
    })
  } catch (error) {
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code.toUpperCase()
        : null

    if (code === 'P2002') {
      return
    }

    throw mapEnsureCurrentUserError(error, {
      conditionFailed: 'user_missing_create_failed',
      nullOrEmptyQuery: userLookupQuery,
    })
  }
}

function mapEnsureCurrentUserError(
  error: unknown,
  details: {
    conditionFailed: string
    nullOrEmptyQuery: string | null
  }
): Error {
  const message = error instanceof Error ? error.message : String(error)
  const normalizedMessage = message.toLowerCase()
  const isDatabaseUrlError = normalizedMessage.includes('datasource') && normalizedMessage.includes('url')
  const isConnectivityError = isDatabaseConnectivityError(error)
  const safeMessage = sanitizePotentialSecrets(message)

  logUserInitFailure(details, error)

  if (isDatabaseUrlError) {
    return new Error(`${POSTGRES_DATABASE_URL_HELP} Root cause: ${safeMessage}`)
  }

  if (isConnectivityError) {
    return new Error(
      `Database connection unavailable. Unable to reach Postgres. Root cause: ${safeMessage}`
    )
  }

  if (error instanceof Error) {
    return error
  }

  return new Error(safeMessage)
}

function logUserInitFailure(
  details: {
    conditionFailed: string
    nullOrEmptyQuery: string | null
  },
  error: unknown
) {
  const errorObject =
    error && typeof error === 'object' ? (error as { name?: unknown; code?: unknown; message?: unknown }) : {}
  const errorName = typeof errorObject.name === 'string' ? errorObject.name : null
  const errorCode =
    typeof errorObject.code === 'string' || typeof errorObject.code === 'number'
      ? String(errorObject.code)
      : null
  const errorMessage =
    typeof errorObject.message === 'string'
      ? sanitizePotentialSecrets(errorObject.message)
      : sanitizePotentialSecrets(String(error))

  console.error('User initialization failed', {
    conditionFailed: details.conditionFailed,
    demoUserIdPresent: Boolean(process.env.DEMO_USER_ID?.trim()),
    nullOrEmptyQuery: details.nullOrEmptyQuery,
    error: {
      name: errorName,
      code: errorCode,
      message: errorMessage,
    },
  })
}

function sanitizePotentialSecrets(value: string): string {
  return value
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@/\s]+@/gi, '$1***@')
    .replace(/([?&]password=)[^&\s]+/gi, '$1***')
}
