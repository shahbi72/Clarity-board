export const FALLBACK_AUTH_COOKIE_NAME = 'clarityboard.session'
const FALLBACK_AUTH_COOKIE_VALUE = 'demo'
const FALLBACK_AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function buildSecureDirective(secure: boolean): string {
  return secure ? '; Secure' : ''
}

export function hasFallbackSessionValue(value: string | null | undefined): boolean {
  return value === FALLBACK_AUTH_COOKIE_VALUE
}

export function getCookieValueFromHeader(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim()
    if (!trimmedCookie) continue

    const separatorIndex = trimmedCookie.indexOf('=')
    if (separatorIndex < 0) continue

    const cookieName = trimmedCookie.slice(0, separatorIndex)
    if (cookieName !== name) continue

    const rawValue = trimmedCookie.slice(separatorIndex + 1)
    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }

  return null
}

export function hasFallbackSessionFromCookieHeader(cookieHeader: string): boolean {
  return hasFallbackSessionValue(
    getCookieValueFromHeader(cookieHeader, FALLBACK_AUTH_COOKIE_NAME)
  )
}

export function createFallbackSessionCookie(options?: { secure?: boolean }): string {
  const secureDirective = buildSecureDirective(Boolean(options?.secure))
  return `${FALLBACK_AUTH_COOKIE_NAME}=${FALLBACK_AUTH_COOKIE_VALUE}; Path=/; Max-Age=${FALLBACK_AUTH_MAX_AGE_SECONDS}; SameSite=Lax${secureDirective}`
}

export function clearFallbackSessionCookie(options?: { secure?: boolean }): string {
  const secureDirective = buildSecureDirective(Boolean(options?.secure))
  return `${FALLBACK_AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureDirective}`
}
