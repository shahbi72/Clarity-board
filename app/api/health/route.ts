import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'

type ErrorLike = {
  code?: unknown
  errorCode?: unknown
  message?: unknown
  name?: unknown
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getPrismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  const errorLike = error as ErrorLike
  if (typeof errorLike.code === 'string' && /^P\d{4}$/.test(errorLike.code)) {
    return errorLike.code
  }
  if (typeof errorLike.errorCode === 'string' && /^P\d{4}$/.test(errorLike.errorCode)) {
    return errorLike.errorCode
  }

  if (typeof errorLike.message === 'string') {
    const match = errorLike.message.match(/\bP\d{4}\b/)
    if (match) {
      return match[0]
    }
  }

  return null
}

function sanitizeErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error)

  return rawMessage
    .replace(/(postgres(?:ql)?:\/\/[^:/\s]+:)([^@/\s]+)@/gi, '$1[REDACTED]@')
    .replace(/([?&](?:password|pass|pwd|token|apikey|api_key)=)[^&\s]+/gi, '$1[REDACTED]')
}

function getErrorName(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = (error as ErrorLike).name
    if (typeof value === 'string' && value.trim().length > 0) {
      return value
    }
  }

  return 'UnknownError'
}

function getBuildStamp() {
  return {
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  }
}

function getEnvDiagnostics() {
  const databaseUrl = process.env.DATABASE_URL ?? ''
  const directUrl = process.env.DIRECT_URL ?? ''
  const preparedStatementsDisabled =
    (process.env.PRISMA_DISABLE_POSTGRESQL_PREPARED_STATEMENTS ?? '').toLowerCase() === 'true'

  const diagnostics = {
    databaseUrlConfigured: databaseUrl.length > 0,
    directUrlConfigured: directUrl.length > 0,
    preparedStatementsDisabled,
    databaseHost: null as string | null,
    databasePort: null as string | null,
    hasSslModeRequire: false,
    hasPgbouncerTrue: false,
  }

  if (!databaseUrl) {
    return diagnostics
  }

  try {
    const parsed = new URL(databaseUrl)
    diagnostics.databaseHost = parsed.hostname || null
    diagnostics.databasePort = parsed.port || null
    diagnostics.hasSslModeRequire = parsed.searchParams.get('sslmode') === 'require'
    diagnostics.hasPgbouncerTrue = parsed.searchParams.get('pgbouncer') === 'true'
  } catch {
    // keep defaults when url parsing fails
  }

  return diagnostics
}

function jsonNoStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(): Promise<Response> {
  const startedAt = Date.now()
  const build = getBuildStamp()
  const env = getEnvDiagnostics()

  try {
    await prisma.$queryRaw`SELECT 1`

    return jsonNoStore({
      status: 'ok',
      database: 'up',
      build,
      env,
      uptimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const name = getErrorName(error)
    const code = getPrismaErrorCode(error)
    const message = sanitizeErrorMessage(error)
    console.error('DB ERROR:', {
      name,
      code,
      message,
      error,
    })

    return jsonNoStore({
      status: 'error',
      database: 'down',
      build,
      env,
      error: {
        name,
        code,
        message,
      },
      uptimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    }, 503)
  }
}

