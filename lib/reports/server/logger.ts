import { randomUUID } from 'crypto'

type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const REDACT_KEYS = /(token|secret|password|authorization|cookie|rowsjson|rawsnapshot|values)/i

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length > 10 ? `[array:${value.length}]` : value.map(sanitizeValue)
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
      if (REDACT_KEYS.test(key)) {
        result[key] = '[REDACTED]'
      } else {
        result[key] = sanitizeValue(innerValue)
      }
    }
    return result
  }

  return value
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context: sanitizeValue(context) } : {}),
  }

  const serialized = JSON.stringify(payload)

  if (level === 'error') {
    console.error(serialized)
    return
  }

  if (level === 'warn') {
    console.warn(serialized)
    return
  }

  console.log(serialized)
}

export function createRequestId(): string {
  return randomUUID()
}

export const logger = {
  info(message: string, context?: LogContext) {
    emit('info', message, context)
  },
  warn(message: string, context?: LogContext) {
    emit('warn', message, context)
  },
  error(message: string, context?: LogContext) {
    emit('error', message, context)
  },
}

