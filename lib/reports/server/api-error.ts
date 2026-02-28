import { NextResponse } from 'next/server'
import type { ZodSchema } from 'zod'

export type ApiErrorShape = {
  error: {
    code: string
    message: string
    details?: unknown
    requestId?: string
  }
}

export class ApiError extends Error {
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

export function jsonError(error: ApiError, requestId?: string): NextResponse<ApiErrorShape> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    },
    { status: error.status }
  )
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    throw new ApiError(400, 'invalid_json', 'Request body must be valid JSON.')
  }

  const result = schema.safeParse(payload)
  if (!result.success) {
    throw new ApiError(400, 'validation_error', 'Invalid request payload.', result.error.flatten())
  }

  return result.data
}

export function parseQuery<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new ApiError(400, 'validation_error', 'Invalid query parameters.', result.error.flatten())
  }
  return result.data
}

