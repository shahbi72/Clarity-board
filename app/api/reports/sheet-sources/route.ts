import { z } from 'zod'
import { requireReportsAuthContext } from '@/lib/reports/auth/context'
import { getGoogleConnection } from '@/lib/reports/google/client'
import { syncSheetSource } from '@/lib/reports/ingestion/sync'
import { parseJsonBody } from '@/lib/reports/server/api-error'
import { writeAuditLog } from '@/lib/reports/server/audit'
import { enforceRateLimit, rateLimitKey } from '@/lib/reports/server/rate-limit'
import { jsonOk, withApiHandler } from '@/lib/reports/server/route'
import { getBillingGate } from '@/lib/reports/server/tenancy'
import { prisma } from '@/lib/server/prisma'

const createSchema = z.object({
  spreadsheetId: z.string().min(1).max(200),
  spreadsheetName: z.string().min(1).max(200),
  sheetName: z.string().min(1).max(200),
  sheetId: z.number().int().optional(),
})

export async function GET(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_sheet_sources_list', auth.userId), 60, 60_000)

    const items = await prisma.sheetSource.findMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
      },
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            rowCount: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return jsonOk({ data: items })
  })
}

export async function POST(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    const auth = await requireReportsAuthContext()
    enforceRateLimit(rateLimitKey(request, 'reports_sheet_sources_create', auth.userId), 20, 60_000)
    const gate = await getBillingGate(auth.userId)
    if (!gate.allowed) {
      return jsonOk({ data: { paywalled: true, gate } }, { status: 402 })
    }

    const payload = await parseJsonBody(request, createSchema)
    const connection = await getGoogleConnection(auth.workspaceId, auth.userId)

    const source = await prisma.sheetSource.upsert({
      where: {
        workspaceId_spreadsheetId_sheetName: {
          workspaceId: auth.workspaceId,
          spreadsheetId: payload.spreadsheetId,
          sheetName: payload.sheetName,
        },
      },
      update: {
        connectionId: connection.id,
        spreadsheetName: payload.spreadsheetName,
        sheetId: payload.sheetId,
        isActive: true,
      },
      create: {
        workspaceId: auth.workspaceId,
        userId: auth.userId,
        connectionId: connection.id,
        spreadsheetId: payload.spreadsheetId,
        spreadsheetName: payload.spreadsheetName,
        sheetName: payload.sheetName,
        sheetId: payload.sheetId,
        isActive: true,
      },
    })

    const syncResult = await syncSheetSource({
      sheetSourceId: source.id,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      triggeredBy: 'MANUAL',
    })

    await writeAuditLog({
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      action: 'sheet_source.connected',
      resourceType: 'sheet_source',
      resourceId: source.id,
      metadata: {
        spreadsheetId: payload.spreadsheetId,
        sheetName: payload.sheetName,
      },
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })

    return jsonOk({
      data: {
        sheetSourceId: source.id,
        datasetId: syncResult.datasetId,
        syncRunId: syncResult.syncRunId,
      },
    })
  })
}

