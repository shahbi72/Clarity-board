import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { parseShopifyOrdersCsvText } from '@/lib/server/dataset-parser'
import { buildShopifySummary } from '@/lib/server/shopify-summary'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import type { ShopifySummaryApiResponse, ShopifyTrendRangeDays } from '@/lib/types/shopify'

const DEMO_CSV_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'shopify-orders-demo.csv')

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const rangeDays = parseRangeDays(url.searchParams.get('rangeDays'))
    const includeCancelled = parseBoolean(url.searchParams.get('includeCancelled'))

    const csv = await fs.readFile(DEMO_CSV_PATH, 'utf8')
    const parsed = parseShopifyOrdersCsvText(csv, 'shopify-orders-demo.csv')
    const rows = parsed.rows.map((row) => ({
      orderId: String(row.orderId ?? ''),
      orderName: String(row.orderName ?? ''),
      createdAt: row.createdAt ? String(row.createdAt) : null,
      createdDate: String(row.createdDate ?? ''),
      lineitemSku: row.lineitemSku ? String(row.lineitemSku) : null,
      productName: String(row.productName ?? ''),
      quantity: Number(row.quantity ?? 0),
      lineGrossUsd: Number(row.lineGrossUsd ?? 0),
      refundedAmountUsd: Number(row.refundedAmountUsd ?? 0),
      estimatedLineCostUsd:
        row.estimatedLineCostUsd == null ? null : Number(row.estimatedLineCostUsd),
      isCancelled: row.isCancelled === true || String(row.isCancelled ?? '').toLowerCase() === 'true',
    }))

    const summary = buildShopifySummary({
      rows,
      datasetName: 'Shopify Demo Store',
      rangeDays,
      includeCancelled,
      source: 'demo',
    })

    const response: ShopifySummaryApiResponse = {
      paywalled: false,
      summary,
    }

    return NextResponse.json(response)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    const response: ShopifySummaryApiResponse = {
      paywalled: false,
      error: getErrorMessage(error),
    }
    return NextResponse.json(response, { status })
  }
}

function parseRangeDays(value: string | null): ShopifyTrendRangeDays {
  return value === '30' ? 30 : 7
}

function parseBoolean(value: string | null): boolean {
  return value === '1' || value === 'true'
}
