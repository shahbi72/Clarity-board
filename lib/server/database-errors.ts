const CONNECTION_ERROR_PATTERNS = [
  'p1001',
  'p1011',
  "can't reach database server",
  'database connection unavailable',
  'error opening a tls connection',
  'self-signed certificate in certificate chain',
  'connection terminated due to connection timeout',
  'timeout expired',
  'etimedout',
  'econnrefused',
  'econnreset',
]

function toErrorText(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`
  }
  return String(error)
}

export function isDatabaseConnectivityError(error: unknown): boolean {
  const message = toErrorText(error).toLowerCase()
  if (CONNECTION_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) {
    return true
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const codeValue = (error as { code?: unknown }).code
    if (typeof codeValue === 'string') {
      const normalizedCode = codeValue.toUpperCase()
      if (normalizedCode === 'P1001' || normalizedCode === 'P1011') {
        return true
      }
    }
  }

  return false
}
