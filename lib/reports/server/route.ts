import { NextResponse } from 'next/server'
import { ApiError, jsonError } from '@/lib/reports/server/api-error'
import { createRequestId, logger } from '@/lib/reports/server/logger'

type RouteContext = {
  requestId: string
}

type RouteHandler = (context: RouteContext) => Promise<Response>

export async function withApiHandler(handler: RouteHandler): Promise<Response> {
  const requestId = createRequestId()

  try {
    const response = await handler({ requestId })
    response.headers.set('x-request-id', requestId)
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error, requestId)
    }

    logger.error('Unhandled API error', {
      requestId,
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return jsonError(new ApiError(500, 'internal_error', 'An unexpected error occurred.'), requestId)
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init)
}

export function requireCronSecret(request: Request): void {
  const headerValue = request.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET?.trim()

  if (!expected || headerValue !== expected) {
    throw new ApiError(401, 'unauthorized_cron', 'Cron secret is invalid.')
  }
}

