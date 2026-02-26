import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import {
  findSubscriptionByPaddleIdentifiers,
  mapPaddleTransactionStatus,
  parsePaddleDate,
  upsertSubscriptionForUser,
} from '@/lib/server/subscriptions'

export const runtime = 'nodejs'

type PaddleWebhookPayload = {
  event_type?: string
  data?: PaddleTransactionData
}

type PaddleTransactionData = {
  status?: string | null
  customer_id?: string | null
  subscription_id?: string | null
  custom_data?: Record<string, unknown> | null
  billing_period?: {
    ends_at?: string | null
  } | null
  items?: Array<{
    price?: {
      id?: string | null
    } | null
  }> | null
}

type ParsedSignatureHeader = {
  timestamp: string
  signatures: string[]
}

function parseSignatureHeader(headerValue: string | null): ParsedSignatureHeader | null {
  if (!headerValue) {
    return null
  }

  const keyValues = headerValue
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const signatures: string[] = []
  let timestamp = ''

  for (const keyValue of keyValues) {
    const [rawKey, rawValue] = keyValue.split('=')
    const key = rawKey?.trim()
    const value = rawValue?.trim()

    if (!key || !value) {
      continue
    }

    if (key === 'ts') {
      timestamp = value
    } else if (key === 'h1') {
      signatures.push(value)
    }
  }

  if (!timestamp || signatures.length === 0) {
    return null
  }

  return {
    timestamp,
    signatures,
  }
}

function isHexDigest(value: string): boolean {
  return /^[a-f0-9]+$/i.test(value) && value.length % 2 === 0
}

function safeCompareHex(expected: string, candidate: string): boolean {
  if (!isHexDigest(expected) || !isHexDigest(candidate) || expected.length !== candidate.length) {
    return false
  }

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(candidate, 'hex'))
  } catch {
    return false
  }
}

function isValidSignature({
  rawBody,
  signatureHeader,
  secret,
}: {
  rawBody: string
  signatureHeader: string | null
  secret: string
}): boolean {
  const parsedHeader = parseSignatureHeader(signatureHeader)
  if (!parsedHeader) {
    return false
  }

  const toleranceSecondsRaw = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS ?? '300')
  const toleranceSeconds =
    Number.isFinite(toleranceSecondsRaw) && toleranceSecondsRaw > 0 ? toleranceSecondsRaw : 300

  const timestampSeconds = Number(parsedHeader.timestamp)
  if (!Number.isFinite(timestampSeconds)) {
    return false
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) {
    return false
  }

  const signedPayload = `${parsedHeader.timestamp}:${rawBody}`
  const expectedSignature = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex')

  return parsedHeader.signatures.some((signature) => safeCompareHex(expectedSignature, signature))
}

function extractUserId(customData: Record<string, unknown> | null | undefined): string | null {
  if (!customData) {
    return null
  }

  const rawUserId = customData.user_id
  if (typeof rawUserId !== 'string') {
    return null
  }

  const normalized = rawUserId.trim()
  return normalized.length > 0 ? normalized : null
}

function extractPlanPriceId(items: PaddleTransactionData['items']): string | null {
  if (!items || items.length === 0) {
    return null
  }

  for (const item of items) {
    const candidate = item.price?.id
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return null
}

async function resolveUserIdFromTransaction(
  transaction: PaddleTransactionData
): Promise<string | null> {
  const userIdFromCustomData = extractUserId(transaction.custom_data)
  if (userIdFromCustomData) {
    return userIdFromCustomData
  }

  const existingSubscription = await findSubscriptionByPaddleIdentifiers({
    paddleCustomerId: transaction.customer_id ?? null,
    paddleSubscriptionId: transaction.subscription_id ?? null,
  })

  return existingSubscription?.userId ?? null
}

async function handleTransactionCompleted(transaction: PaddleTransactionData) {
  const userId = await resolveUserIdFromTransaction(transaction)
  if (!userId) {
    return
  }

  await upsertSubscriptionForUser({
    userId,
    status: 'active',
    paddleCustomerId: transaction.customer_id ?? null,
    paddleSubscriptionId: transaction.subscription_id ?? null,
    planPriceId: extractPlanPriceId(transaction.items),
    currentPeriodEnd: parsePaddleDate(transaction.billing_period?.ends_at),
  })
}

async function handleTransactionUpdated(transaction: PaddleTransactionData) {
  const userId = await resolveUserIdFromTransaction(transaction)
  if (!userId) {
    return
  }

  await upsertSubscriptionForUser({
    userId,
    status: mapPaddleTransactionStatus(transaction.status),
    paddleCustomerId: transaction.customer_id ?? undefined,
    paddleSubscriptionId: transaction.subscription_id ?? undefined,
    planPriceId: extractPlanPriceId(transaction.items) ?? undefined,
    currentPeriodEnd:
      transaction.billing_period?.ends_at !== undefined
        ? parsePaddleDate(transaction.billing_period?.ends_at)
        : undefined,
  })
}

export async function POST(request: Request) {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET?.trim() ?? ''
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Paddle webhook secret is not configured.' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signatureHeader = request.headers.get('Paddle-Signature')

  const validSignature = isValidSignature({
    rawBody,
    signatureHeader,
    secret: webhookSecret,
  })

  if (!validSignature) {
    return NextResponse.json({ error: 'Invalid Paddle signature.' }, { status: 401 })
  }

  let payload: PaddleWebhookPayload

  try {
    payload = JSON.parse(rawBody) as PaddleWebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const eventType = payload.event_type
  const transaction = payload.data

  if (!eventType || !transaction) {
    return NextResponse.json({ ok: true })
  }

  if (eventType === 'transaction.completed') {
    await handleTransactionCompleted(transaction)
  } else if (eventType === 'transaction.updated') {
    await handleTransactionUpdated(transaction)
  }

  return NextResponse.json({ ok: true })
}
