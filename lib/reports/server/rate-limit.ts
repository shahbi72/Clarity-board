import { ApiError } from '@/lib/reports/server/api-error'

type Bucket = {
  count: number
  resetAt: number
}

const globalRateLimiter = globalThis as typeof globalThis & {
  __reportsRateLimitMap?: Map<string, Bucket>
}

const buckets = globalRateLimiter.__reportsRateLimitMap ?? new Map<string, Bucket>()
if (!globalRateLimiter.__reportsRateLimitMap) {
  globalRateLimiter.__reportsRateLimitMap = buckets
}

export function resolveClientIp(request: Request): string {
  const header = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return header || 'unknown'
}

export function rateLimitKey(request: Request, scope: string, userId?: string): string {
  return [scope, userId ?? resolveClientIp(request)].join(':')
}

export function enforceRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now()
  const entry = buckets.get(key)

  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (entry.count >= maxRequests) {
    throw new ApiError(429, 'rate_limited', 'Too many requests. Try again later.', {
      retryAfterMs: Math.max(0, entry.resetAt - now),
    })
  }

  entry.count += 1
}

