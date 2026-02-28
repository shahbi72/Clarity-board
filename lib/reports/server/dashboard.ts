import { ApiError } from '@/lib/reports/server/api-error'
import type { CleanRow } from '@/lib/reports/cleaning/engine'
import { computeDashboardMetrics, type DateRange } from '@/lib/reports/kpi/metrics'
import { prisma } from '@/lib/server/prisma'

export async function getWorkspaceSheetSources(workspaceId: string, userId: string) {
  return prisma.sheetSource.findMany({
    where: {
      workspaceId,
      userId,
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
}

export async function getDatasetDashboardSummary(params: {
  workspaceId: string
  userId: string
  datasetId?: string
  range?: DateRange
}) {
  let datasetId = params.datasetId

  if (!datasetId) {
    const latestSource = await prisma.sheetSource.findFirst({
      where: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        isActive: true,
        datasetId: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { datasetId: true },
    })

    datasetId = latestSource?.datasetId ?? undefined
  }

  if (!datasetId) {
    return {
      dataset: null,
      mapping: null,
      metrics: null,
    }
  }

  const [dataset, cleanTable, mapping] = await Promise.all([
    prisma.dataset.findFirst({
      where: {
        id: datasetId,
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
      select: {
        id: true,
        name: true,
        rowCount: true,
        updatedAt: true,
      },
    }),
    prisma.cleanTable.findUnique({
      where: { datasetId },
      select: {
        rowsJson: true,
      },
    }),
    prisma.kpiMapping.findUnique({
      where: { datasetId },
    }),
  ])

  if (!dataset) {
    throw new ApiError(404, 'dataset_not_found', 'Dataset not found for current workspace.')
  }

  if (!cleanTable || !mapping) {
    return {
      dataset,
      mapping,
      metrics: null,
    }
  }

  const rows = (Array.isArray(cleanTable.rowsJson) ? cleanTable.rowsJson : []) as CleanRow[]

  const metrics = computeDashboardMetrics({
    rows,
    mapping: {
      dateColumn: mapping.dateColumn,
      revenueColumn: mapping.revenueColumn,
      costColumn: mapping.costColumn,
      ordersColumn: mapping.ordersColumn,
      profitColumn: mapping.profitColumn,
      conversionRateColumn: mapping.conversionRateColumn,
      confidence: (mapping.inferenceConfidence as Record<string, number>) ?? {},
      derivedProfit: !mapping.profitColumn && Boolean(mapping.revenueColumn && mapping.costColumn),
    },
    range: params.range,
  })

  return {
    dataset,
    mapping,
    metrics,
  }
}

