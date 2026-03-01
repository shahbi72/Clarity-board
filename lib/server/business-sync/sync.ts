import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import type { ShopifySummary } from '@/lib/types/shopify'
import type { DataRow } from '@/lib/types/data-pipeline'
import { parseShopifyOrdersCsvText } from '@/lib/server/dataset-parser'
import { buildShopifySummary } from '@/lib/server/shopify-summary'
import { HttpError } from '@/lib/server/http-error'
import { prisma } from '@/lib/server/prisma'
import { logger } from '@/lib/reports/server/logger'
import { fetchSelectedSheetValuesForUser } from '@/lib/server/business-sync/google'
import { detectInsightsFromSummaryChange } from '@/lib/server/business-sync/insights'

const ROW_INSERT_BATCH_SIZE = 500

export type BusinessSyncTrigger = 'MANUAL' | 'CRON'

export type BusinessSyncResult = {
  changed: boolean
  snapshotId: string | null
  insightCount: number
  rowCount: number
  syncedAt: Date
}

type ShopifySummaryRow = {
  orderId: string
  orderName: string
  createdDate: string
  lineitemSku: string | null
  productName: string
  quantity: number
  lineGrossUsd: number
  refundedAmountUsd: number
  estimatedLineCostUsd: number | null
  isCancelled: boolean
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const text = value == null ? '' : String(value)
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function valuesToCsv(values: Array<Array<string | number | boolean | null>>): string {
  if (values.length === 0) {
    throw new HttpError(400, 'The selected sheet is empty.')
  }

  const rows = values
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')

  if (!rows.trim()) {
    throw new HttpError(400, 'The selected sheet does not contain valid data.')
  }

  return rows
}

function mapParsedRowsToSummaryRows(rows: DataRow[]): ShopifySummaryRow[] {
  return rows
    .map((row) => ({
      orderId: String(row.orderId ?? ''),
      orderName: String(row.orderName ?? ''),
      createdDate: String(row.createdDate ?? ''),
      lineitemSku: row.lineitemSku ? String(row.lineitemSku) : null,
      productName: String(row.productName ?? ''),
      quantity: Number(row.quantity ?? 0),
      lineGrossUsd: Number(row.lineGrossUsd ?? 0),
      refundedAmountUsd: Number(row.refundedAmountUsd ?? 0),
      estimatedLineCostUsd:
        row.estimatedLineCostUsd == null ? null : Number(row.estimatedLineCostUsd),
      isCancelled:
        row.isCancelled === true || String(row.isCancelled ?? '').toLowerCase() === 'true',
    }))
    .filter((row) => Boolean(row.orderId && row.orderName && row.createdDate && row.productName))
}

function asShopifySummary(value: Prisma.JsonValue | null | undefined): ShopifySummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const summary = value as unknown as ShopifySummary
  if (!summary.totals || typeof summary.totals.totalRevenue !== 'number') {
    return null
  }

  return summary
}

function buildSnapshotHash(summary: ShopifySummary): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        totals: summary.totals,
        trend: summary.trend,
        topProducts: summary.topProducts,
        excludedCancelledOrders: summary.excludedCancelledOrders,
      })
    )
    .digest('hex')
}

async function upsertUserDatasetFromSync(params: {
  userId: string
  name: string
  rows: DataRow[]
  columns: string[]
}): Promise<string> {
  const existing = await prisma.dataset.findFirst({
    where: { userId: params.userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  return prisma.$transaction(async (tx) => {
    const dataset = existing
      ? await tx.dataset.update({
          where: { id: existing.id },
          data: {
            name: params.name,
            fileType: 'SHOPIFY_ORDERS_CSV',
            sourceType: 'GOOGLE_SHEET',
            rowCount: params.rows.length,
            columns: params.columns,
            sizeBytes: 0,
          },
        })
      : await tx.dataset.create({
          data: {
            userId: params.userId,
            name: params.name,
            fileType: 'SHOPIFY_ORDERS_CSV',
            sourceType: 'GOOGLE_SHEET',
            rowCount: params.rows.length,
            columns: params.columns,
            sizeBytes: 0,
          },
        })

    await tx.datasetRow.deleteMany({
      where: { datasetId: dataset.id },
    })

    for (let index = 0; index < params.rows.length; index += ROW_INSERT_BATCH_SIZE) {
      const chunk = params.rows.slice(index, index + ROW_INSERT_BATCH_SIZE)
      await tx.datasetRow.createMany({
        data: chunk.map((row, offset) => ({
          datasetId: dataset.id,
          rowIndex: index + offset,
          data: row as Prisma.InputJsonValue,
        })),
      })
    }

    await tx.user.update({
      where: { id: params.userId },
      data: {
        activeDatasetId: dataset.id,
      },
    })

    return dataset.id
  })
}

export async function runBusinessSyncForUser(params: {
  userId: string
  trigger: BusinessSyncTrigger
}): Promise<BusinessSyncResult> {
  const fetched = await fetchSelectedSheetValuesForUser(params.userId)
  const csv = valuesToCsv(fetched.values)
  const parsed = parseShopifyOrdersCsvText(csv, `${fetched.sheetName}.csv`)

  await upsertUserDatasetFromSync({
    userId: params.userId,
    name: `${fetched.spreadsheetName} - ${fetched.sheetName}`,
    rows: parsed.rows,
    columns: parsed.columns,
  })

  const summaryRows = mapParsedRowsToSummaryRows(parsed.rows)
  const summary = buildShopifySummary({
    rows: summaryRows,
    datasetName: `${fetched.spreadsheetName} - ${fetched.sheetName}`,
    includeCancelled: false,
    rangeDays: 30,
    source: 'user',
  })

  const hash = buildSnapshotHash(summary)
  const previousSnapshot = await prisma.dataSnapshot.findFirst({
    where: {
      sourceId: fetched.connectionId,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      hash: true,
      summaryJson: true,
    },
  })

  if (previousSnapshot?.hash === hash) {
    const syncedAt = new Date()
    await prisma.sheetConnection.update({
      where: { id: fetched.connectionId },
      data: { lastSyncedAt: syncedAt },
    })

    return {
      changed: false,
      snapshotId: previousSnapshot.id,
      insightCount: 0,
      rowCount: parsed.rowCount,
      syncedAt,
    }
  }

  let snapshotId: string | null = null
  const syncedAt = new Date()

  try {
    const snapshot = await prisma.dataSnapshot.create({
      data: {
        userId: params.userId,
        sourceId: fetched.connectionId,
        hash,
        summaryJson: summary as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    })

    snapshotId = snapshot.id
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existingSnapshot = await prisma.dataSnapshot.findFirst({
        where: {
          sourceId: fetched.connectionId,
          hash,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      snapshotId = existingSnapshot?.id ?? null
    } else {
      throw error
    }
  }

  if (!snapshotId) {
    throw new HttpError(500, 'Unable to create snapshot for sheet sync.')
  }

  const previousSummary = asShopifySummary(previousSnapshot?.summaryJson)
  const insightDrafts = detectInsightsFromSummaryChange({
    previous: previousSummary,
    current: summary,
  })

  if (insightDrafts.length > 0) {
    await prisma.insightEvent.createMany({
      data: insightDrafts.map((insight) => ({
        userId: params.userId,
        sourceId: fetched.connectionId,
        snapshotId,
        type: insight.type,
        title: insight.title,
        body: insight.body,
        severity: insight.severity,
        deltaJson: insight.deltaJson,
      })),
      skipDuplicates: true,
    })
  }

  await prisma.sheetConnection.update({
    where: { id: fetched.connectionId },
    data: { lastSyncedAt: syncedAt },
  })

  logger.info('Business sync completed', {
    trigger: params.trigger,
    userId: params.userId,
    changed: true,
    insightCount: insightDrafts.length,
    rowCount: parsed.rowCount,
  })

  return {
    changed: true,
    snapshotId,
    insightCount: insightDrafts.length,
    rowCount: parsed.rowCount,
    syncedAt,
  }
}

export async function runBusinessSyncForEligibleUsers(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const connections = await prisma.sheetConnection.findMany({
    where: {
      spreadsheetId: { not: null },
      sheetName: { not: null },
      user: {
        subscription: {
          is: {
            provider: 'PADDLE',
            plan: {
              in: ['business', 'pro'],
            },
            OR: [
              {
                status: 'active',
              },
              {
                status: 'trialing',
                trialEndsAt: {
                  gt: new Date(),
                },
              },
            ],
          },
        },
      },
    },
    select: {
      userId: true,
    },
  })

  let succeeded = 0
  let failed = 0

  for (const connection of connections) {
    try {
      await runBusinessSyncForUser({
        userId: connection.userId,
        trigger: 'CRON',
      })
      succeeded += 1
    } catch (error) {
      failed += 1
      logger.warn('Business sync failed for user', {
        userId: connection.userId,
        error: error instanceof Error ? error.message : 'unknown_error',
      })
    }
  }

  return {
    processed: connections.length,
    succeeded,
    failed,
  }
}
