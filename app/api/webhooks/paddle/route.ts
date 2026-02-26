import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import {
  findSubscriptionByPaddleIdentifiers,
  mapPaddleTransactionStatus,
  parsePaddleDate,
  resolvePlanForTransaction,
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
  customer?: {
    id?: string | null
  } | null
  subscription?: {
    id?: string | null
  } | null
  custom_data?: Record<string, unknown> | null
  billing_period?: {
    ends_at?: string | null
  } | null
  items?: Array<{
    price_id?: string | null
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

function extractPlan(customData: Record<string, unknown> | null | undefined): string | null {
  if (!customData) {
    return null
  }

  const rawPlan = customData.plan
  if (typeof rawPlan !== 'string') {
    return null
  }

  const normalized = rawPlan.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function extractPlanPriceId(items: PaddleTransactionData['items']): string | null {
  if (!items || items.length === 0) {
    return null
  }

  for (const item of items) {
    const candidate = item.price?.id ?? item.price_id
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return null
}

function extractCustomerId(transaction: PaddleTransactionData): string | null {
  const directId = transaction.customer_id
  if (typeof directId === 'string' && directId.trim().length > 0) {
    return directId.trim()
  }

  const nestedId = transaction.customer?.id
  if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
    return nestedId.trim()
  }

  return null
}

function extractSubscriptionId(transaction: PaddleTransactionData): string | null {
  const directId = transaction.subscription_id
  if (typeof directId === 'string' && directId.trim().length > 0) {
    return directId.trim()
  }

  const nestedId = transaction.subscription?.id
  if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
    return nestedId.trim()
  }

  return null
}

async function resolveTransactionContext(transaction: PaddleTransactionData) {
  const customData = transaction.custom_data ?? null
  const paddleCustomerId = extractCustomerId(transaction)
  const paddleSubscriptionId = extractSubscriptionId(transaction)

  const existingSubscription = await findSubscriptionByPaddleIdentifiers({
    paddleCustomerId,
    paddleSubscriptionId,
  })

  const userId = extractUserId(customData) ?? existingSubscription?.userId ?? null
  const planPriceId = extractPlanPriceId(transaction.items) ?? existingSubscription?.planPriceId ?? null
  const plan = resolvePlanForTransaction({
    explicitPlan: extractPlan(customData),
    planPriceId,
    existingSubscription,
  })

  return {
    userId,
    plan,
    planPriceId,
    existingSubscription,
    paddleCustomerId,
    paddleSubscriptionId,
  }
}

async function handleTransactionCompleted(transaction: PaddleTransactionData) {
  const context = await resolveTransactionContext(transaction)
  if (!context.userId || !context.plan) {
    return
  }

  await upsertSubscriptionForUser({
    userId: context.userId,
    plan: context.plan,
    status: 'active',
    planPriceId: context.planPriceId,
    paddleCustomerId: context.paddleCustomerId ?? context.existingSubscription?.paddleCustomerId ?? null,
    paddleSubscriptionId:
      context.paddleSubscriptionId ?? context.existingSubscription?.paddleSubscriptionId ?? null,
    currentPeriodEnd:
      parsePaddleDate(transaction.billing_period?.ends_at) ??
      context.existingSubscription?.currentPeriodEnd ??
      null,
  })
}

async function handleTransactionUpdated(transaction: PaddleTransactionData) {
  const context = await resolveTransactionContext(transaction)
  if (!context.userId || !context.plan) {
    return
  }

  const hasBillingPeriodEnd = transaction.billing_period?.ends_at !== undefined
  const currentPeriodEnd = hasBillingPeriodEnd
    ? parsePaddleDate(transaction.billing_period?.ends_at)
    : context.existingSubscription?.currentPeriodEnd ?? null

  await upsertSubscriptionForUser({
    userId: context.userId,
    plan: context.plan,
    status: mapPaddleTransactionStatus(transaction.status),
    planPriceId: context.planPriceId,
    paddleCustomerId: context.paddleCustomerId ?? context.existingSubscription?.paddleCustomerId ?? null,
    paddleSubscriptionId:
      context.paddleSubscriptionId ?? context.existingSubscription?.paddleSubscriptionId ?? null,
    currentPeriodEnd,
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
