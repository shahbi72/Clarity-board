import { prisma } from '@/lib/server/prisma'
import { cleanSheetRows } from '@/lib/reports/cleaning/engine'
import { pullSheetValues } from '@/lib/reports/google/client'
import { selectRowKey, stableRowHash } from '@/lib/reports/ingestion/hash'
import { inferKpis } from '@/lib/reports/kpi/inference'
import { writeAuditLog } from '@/lib/reports/server/audit'
import { logger } from '@/lib/reports/server/logger'
import { ApiError } from '@/lib/reports/server/api-error'
import { getBillingGate } from '@/lib/reports/server/tenancy'

export type SyncSourceResult = {
  syncRunId: string
  datasetId: string
  rowsFetched: number
  rowsCleaned: number
  rowsInserted: number
  rowsUpdated: number
  rowsSkipped: number
}

export async function syncSheetSource(params: {
  sheetSourceId: string
  userId: string
  workspaceId: string
  triggeredBy: 'MANUAL' | 'CRON' | 'WEBHOOK'
}): Promise<SyncSourceResult> {
  const source = await prisma.sheetSource.findFirst({
    where: {
      id: params.sheetSourceId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      isActive: true,
    },
    include: {
      connection: true,
      dataset: true,
    },
  })

  if (!source) {
    throw new ApiError(404, 'sheet_source_not_found', 'Sheet source not found for this workspace.')
  }

  const dataset =
    source.dataset ??
    (await prisma.dataset.create({
      data: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        name: `${source.spreadsheetName} / ${source.sheetName}`,
        fileType: 'google-sheet',
        sourceType: 'GOOGLE_SHEET',
        sizeBytes: 0,
        rowCount: 0,
        columns: [],
      },
    }))

  if (!source.datasetId) {
    await prisma.sheetSource.update({
      where: { id: source.id },
      data: {
        datasetId: dataset.id,
      },
    })

    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        sheetSourceId: source.id,
      },
    })
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      sheetSourceId: source.id,
      datasetId: dataset.id,
      status: 'RUNNING',
      triggeredBy: params.triggeredBy,
    },
    select: { id: true },
  })

  try {
    const values = await pullSheetValues({
      connectionId: source.connectionId,
      spreadsheetId: source.spreadsheetId,
      sheetName: source.sheetName,
    })

    const cleaning = cleanSheetRows(values)

    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        rowCount: cleaning.cleanedRows.length,
        columns: cleaning.headers,
        sizeBytes: JSON.stringify(values).length,
      },
    })

    const existingHashes = await prisma.rowHash.findMany({
      where: { datasetId: dataset.id },
      select: {
        id: true,
        rowKey: true,
        rowHash: true,
      },
    })

    const hashByKey = new Map(existingHashes.map((item) => [item.rowKey, item]))
    const rowKeysSeen = new Set<string>()

    let rowsInserted = 0
    let rowsUpdated = 0
    let rowsSkipped = 0

    for (let index = 0; index < cleaning.cleanedRows.length; index += 1) {
      const row = cleaning.cleanedRows[index]
      const rowKey = selectRowKey(row, index)
      rowKeysSeen.add(rowKey)

      const rowHash = stableRowHash(row)
      const existing = hashByKey.get(rowKey)

      if (!existing) {
        await prisma.rowHash.create({
          data: {
            workspaceId: params.workspaceId,
            userId: params.userId,
            datasetId: dataset.id,
            rowKey,
            rowHash,
            normalizedRow: row,
          },
        })
        rowsInserted += 1
        continue
      }

      if (existing.rowHash === rowHash) {
        rowsSkipped += 1
        continue
      }

      await prisma.rowHash.update({
        where: { id: existing.id },
        data: {
          rowHash,
          normalizedRow: row,
        },
      })
      rowsUpdated += 1
    }

    const staleHashes = existingHashes.filter((rowHash) => !rowKeysSeen.has(rowHash.rowKey)).map((rowHash) => rowHash.id)
    if (staleHashes.length > 0) {
      await prisma.rowHash.deleteMany({
        where: {
          id: { in: staleHashes },
        },
      })
    }

    const latestRows = await prisma.rowHash.findMany({
      where: { datasetId: dataset.id },
      select: { normalizedRow: true },
      orderBy: { rowKey: 'asc' },
    })

    await prisma.cleanTable.upsert({
      where: { datasetId: dataset.id },
      update: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        tableName: `${source.sheetName}_clean`,
        schemaJson: cleaning.headers,
        rowsJson: latestRows.map((item) => item.normalizedRow),
        rowCount: latestRows.length,
        duplicateCount: cleaning.duplicateRowCount,
        typeConfidence: cleaning.columnProfiles,
      },
      create: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        datasetId: dataset.id,
        tableName: `${source.sheetName}_clean`,
        schemaJson: cleaning.headers,
        rowsJson: latestRows.map((item) => item.normalizedRow),
        rowCount: latestRows.length,
        duplicateCount: cleaning.duplicateRowCount,
        typeConfidence: cleaning.columnProfiles,
      },
    })

    const inference = inferKpis({
      headers: cleaning.headers,
      rows: cleaning.cleanedRows,
      profiles: cleaning.columnProfiles,
    })

    const existingMapping = await prisma.kpiMapping.findUnique({ where: { datasetId: dataset.id } })
    if (!existingMapping) {
      await prisma.kpiMapping.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          datasetId: dataset.id,
          dateColumn: inference.dateColumn,
          revenueColumn: inference.revenueColumn,
          costColumn: inference.costColumn,
          ordersColumn: inference.ordersColumn,
          profitColumn: inference.profitColumn,
          conversionRateColumn: inference.conversionRateColumn,
          inferenceConfidence: inference.confidence,
          isOverridden: false,
        },
      })
    } else if (!existingMapping.isOverridden) {
      await prisma.kpiMapping.update({
        where: { datasetId: dataset.id },
        data: {
          dateColumn: inference.dateColumn,
          revenueColumn: inference.revenueColumn,
          costColumn: inference.costColumn,
          ordersColumn: inference.ordersColumn,
          profitColumn: inference.profitColumn,
          conversionRateColumn: inference.conversionRateColumn,
          inferenceConfidence: inference.confidence,
        },
      })
    } else {
      await prisma.kpiMapping.update({
        where: { datasetId: dataset.id },
        data: {
          inferenceConfidence: inference.confidence,
        },
      })
    }

    await prisma.sheetSource.update({
      where: { id: source.id },
      data: {
        lastSyncedAt: new Date(),
        headerRowIndex: cleaning.headerRowIndex,
      },
    })

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        datasetId: dataset.id,
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        rawSnapshot: {
          values,
        },
        rowsFetched: values.length,
        rowsCleaned: cleaning.cleanedRows.length,
        rowsInserted,
        rowsUpdated,
        rowsSkipped,
      },
    })

    await writeAuditLog({
      workspaceId: params.workspaceId,
      userId: params.userId,
      action: 'sheet.sync',
      resourceType: 'sheet_source',
      resourceId: source.id,
      metadata: {
        rowsFetched: values.length,
        rowsCleaned: cleaning.cleanedRows.length,
        rowsInserted,
        rowsUpdated,
        rowsSkipped,
      },
    })

    return {
      syncRunId: syncRun.id,
      datasetId: dataset.id,
      rowsFetched: values.length,
      rowsCleaned: cleaning.cleanedRows.length,
      rowsInserted,
      rowsUpdated,
      rowsSkipped,
    }
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'unknown_error',
      },
    })

    logger.error('Sheet sync failed', {
      syncRunId: syncRun.id,
      sheetSourceId: params.sheetSourceId,
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    throw error
  }
}

export async function syncAllActiveSheetSources(): Promise<{
  processed: number
  succeeded: number
  failed: number
  skipped: number
}> {
  const sources = await prisma.sheetSource.findMany({
    where: { isActive: true },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
    },
    orderBy: { updatedAt: 'asc' },
  })

  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const source of sources) {
    try {
      const gate = await getBillingGate(source.userId)
      if (!gate.allowed) {
        skipped += 1
        continue
      }

      await syncSheetSource({
        sheetSourceId: source.id,
        userId: source.userId,
        workspaceId: source.workspaceId,
        triggeredBy: 'CRON',
      })
      succeeded += 1
    } catch {
      failed += 1
    }
  }

  return {
    processed: sources.length,
    succeeded,
    failed,
    skipped,
  }
}

