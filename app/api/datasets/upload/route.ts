import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/server/auth'
import { parseUploadedDatasetFile } from '@/lib/server/dataset-parser'
import { createDatasetForUser } from '@/lib/server/datasets'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { UploadDatasetResponse } from '@/lib/types/data-pipeline'

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const formData = await request.formData()

    const fileEntry = formData.get('file')
    if (!(fileEntry instanceof File)) {
      throw new HttpError(400, 'A CSV or XLSX file is required.')
    }

    const baseName = getFileBaseName(fileEntry.name)
    const rawName = formData.get('datasetName')
    const datasetName = sanitizeDatasetName(
      typeof rawName === 'string' ? rawName : baseName,
      baseName
    )

    const parsed = await parseUploadedDatasetFile(fileEntry)
    const savedDataset = await createDatasetForUser({
      userId,
      name: datasetName,
      fileType: parsed.fileType,
      sizeBytes: fileEntry.size,
      columns: parsed.columns,
      rows: parsed.rows,
    })

    const response: UploadDatasetResponse = {
      datasetId: savedDataset.id,
      datasetName: savedDataset.name,
      fileType: savedDataset.fileType,
      rowCount: savedDataset.rowCount,
      columns: parsed.columns,
      previewRows: parsed.previewRows,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status }
    )
  }
}

function getFileBaseName(fileName: string): string {
  const trimmed = fileName.trim()
  if (!trimmed) return 'dataset'
  const withoutExtension = trimmed.replace(/\.[^/.]+$/, '')
  return withoutExtension || 'dataset'
}

function sanitizeDatasetName(rawName: string, fallback: string): string {
  const cleaned = rawName
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)

  if (cleaned) return cleaned
  return fallback.slice(0, 120) || 'dataset'
}
