import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/server/prisma'
import { HttpError } from '@/lib/server/http-error'
import { ensureCurrentUser } from '@/lib/server/auth'
import type {
  ActiveDatasetMetadata,
  DataRow,
  DatasetListItem,
} from '@/lib/types/data-pipeline'

const ROW_INSERT_BATCH_SIZE = 500

type CreateDatasetInput = {
  userId: string
  name: string
  fileType: string
  sizeBytes: number
  columns: string[]
  rows: DataRow[]
}

export async function createDatasetForUser(input: CreateDatasetInput) {
  await ensureCurrentUser(input.userId)

  const dataset = await prisma.dataset.create({
    data: {
      userId: input.userId,
      name: input.name,
      fileType: input.fileType,
      sizeBytes: input.sizeBytes,
      rowCount: input.rows.length,
      columns: input.columns,
    },
  })

  try {
    for (let index = 0; index < input.rows.length; index += ROW_INSERT_BATCH_SIZE) {
      const chunk = input.rows.slice(index, index + ROW_INSERT_BATCH_SIZE)

      await prisma.datasetRow.createMany({
        data: chunk.map((row, offset) => ({
          datasetId: dataset.id,
          rowIndex: index + offset,
          data: row as Prisma.InputJsonValue,
        })),
      })
    }

    await prisma.user.update({
      where: { id: input.userId },
      data: { activeDatasetId: dataset.id },
    })

    return dataset
  } catch (error) {
    await prisma.dataset.delete({ where: { id: dataset.id } }).catch(() => undefined)
    throw error
  }
}

export async function getDatasetsForUser(userId: string): Promise<{
  datasets: DatasetListItem[]
  activeDatasetId: string | null
}> {
  await ensureCurrentUser(userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeDatasetId: true,
      datasets: {
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!user) {
    return { datasets: [], activeDatasetId: null }
  }

  return {
    activeDatasetId: user.activeDatasetId,
    datasets: user.datasets.map((dataset) => toDatasetListItem(dataset, user.activeDatasetId)),
  }
}

export async function getDatasetDetailsForUser(
  userId: string,
  datasetId: string,
  previewLimit = 50
) {
  await ensureCurrentUser(userId)

  const dataset = await prisma.dataset.findFirst({
    where: { id: datasetId, userId },
  })

  if (!dataset) {
    throw new HttpError(404, 'Dataset not found.')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeDatasetId: true },
  })

  const rows = await prisma.datasetRow.findMany({
    where: { datasetId: dataset.id },
    orderBy: { rowIndex: 'asc' },
    take: Math.max(1, Math.min(previewLimit, 200)),
    select: { data: true },
  })

  return {
    dataset: toDatasetListItem(dataset, user?.activeDatasetId ?? null),
    previewRows: rows.map((row) => asDataRow(row.data)).filter(Boolean) as DataRow[],
  }
}

export async function activateDatasetForUser(userId: string, datasetId: string) {
  await ensureCurrentUser(userId)

  const dataset = await prisma.dataset.findFirst({
    where: { id: datasetId, userId },
    select: { id: true },
  })

  if (!dataset) {
    throw new HttpError(404, 'Dataset not found.')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeDatasetId: datasetId },
  })
}

export async function getActiveDatasetForUser(
  userId: string
): Promise<ActiveDatasetMetadata | null> {
  await ensureCurrentUser(userId)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeDatasetId: true },
  })

  if (!user?.activeDatasetId) {
    return null
  }

  const dataset = await prisma.dataset.findFirst({
    where: { id: user.activeDatasetId, userId },
  })

  if (!dataset) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeDatasetId: null },
    })
    return null
  }

  return toActiveDatasetMetadata(dataset)
}

function toDatasetListItem(
  dataset: {
    id: string
    name: string
    fileType: string
    sizeBytes: number
    rowCount: number
    columns: Prisma.JsonValue
    createdAt: Date
    updatedAt: Date
  },
  activeDatasetId: string | null
): DatasetListItem {
  const columns = Array.isArray(dataset.columns)
    ? dataset.columns.map((column) => String(column))
    : []

  return {
    id: dataset.id,
    name: dataset.name,
    fileType: dataset.fileType,
    sizeBytes: dataset.sizeBytes,
    rowCount: dataset.rowCount,
    columns,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
    isActive: dataset.id === activeDatasetId,
  }
}

function toActiveDatasetMetadata(dataset: {
  id: string
  name: string
  fileType: string
  rowCount: number
  columns: Prisma.JsonValue
  updatedAt: Date
}): ActiveDatasetMetadata {
  const columns = Array.isArray(dataset.columns)
    ? dataset.columns.map((column) => String(column))
    : []

  return {
    id: dataset.id,
    name: dataset.name,
    fileType: dataset.fileType,
    rowCount: dataset.rowCount,
    columns,
    updatedAt: dataset.updatedAt.toISOString(),
  }
}

function asDataRow(value: Prisma.JsonValue): DataRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const row: DataRow = {}

  for (const [key, cell] of Object.entries(record)) {
    if (
      typeof cell === 'string' ||
      typeof cell === 'number' ||
      typeof cell === 'boolean' ||
      cell === null
    ) {
      row[key] = cell
      continue
    }
    row[key] = cell == null ? null : String(cell)
  }

  return row
}
