import { prisma } from '@/lib/server/prisma'

export async function GET(): Promise<Response> {
  const startedAt = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`

    return Response.json({
      status: 'ok',
      database: 'up',
      uptimeMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return Response.json(
      {
        status: 'error',
        database: 'down',
        uptimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

