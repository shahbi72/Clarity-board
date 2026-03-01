import { HttpError } from '@/lib/server/http-error'

type Bucket = {
  count: number
  resetAt: number
}

const globalRateLimiter = globalThis as typeof globalThis & {
  __appRateLimitBuckets?: Map<string, Bucket>
}

const buckets = globalRateLimiter.__appRateLimitBuckets ?? new Map<string, Bucket>()
if (!globalRateLimiter.__appRateLimitBuckets) {
  globalRateLimiter.__appRateLimitBuckets = buckets
}

export function resolveClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export function buildRateLimitKey(scope: string, request: Request, userId?: string): string {
  return [scope, userId ?? resolveClientIp(request)].join(':')
}

export function enforceRateLimit(key: string, maxRequests: number, windowMs: number): void {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (existing.count >= maxRequests) {
    throw new HttpError(429, 'Rate limit exceeded. Please retry shortly.')
  }

  existing.count += 1
}
