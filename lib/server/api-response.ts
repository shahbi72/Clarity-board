import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { HttpError } from '@/lib/server/http-error'

export type ApiErrorShape = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export class ApiRouteError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  return String(error)
}

export function jsonApiError(error: unknown): NextResponse<ApiErrorShape> {
  console.error('DB ERROR:', error)

  if (error instanceof ApiRouteError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status }
    )
  }

  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: {
          code: 'http_error',
          message: error.message,
          details: stringifyError(error),
        },
      },
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'validation_error',
          message: 'Invalid request input.',
          details: error.flatten(),
        },
      },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Unexpected server error.',
        details: stringifyError(error),
      },
    },
    { status: 500 }
  )
}
