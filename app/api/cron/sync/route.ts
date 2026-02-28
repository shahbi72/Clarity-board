import { syncAllActiveSheetSources } from '@/lib/reports/ingestion/sync'
import { jsonOk, requireCronSecret, withApiHandler } from '@/lib/reports/server/route'

export async function GET(request: Request): Promise<Response> {
  return POST(request)
}

export async function POST(request: Request): Promise<Response> {
  return withApiHandler(async () => {
    requireCronSecret(request)
    const result = await syncAllActiveSheetSources()
    return jsonOk({ data: result })
  })
}

