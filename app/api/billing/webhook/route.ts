import { POST as handlePaddleWebhook } from '@/app/api/webhooks/paddle/route'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handlePaddleWebhook(request)
}
