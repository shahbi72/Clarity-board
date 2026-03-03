import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  findSubscriptionByPaddleIdentifiers,
  mapPaddleTransactionStatus,
  parsePaddleDate,
  resolvePlanForTransaction,
  upsertSubscriptionForUser,
} from '@/lib/server/subscriptions'
import { prisma } from '@/lib/server/prisma'

export const runtime = 'nodejs'

type PaddleWebhookPayload = {
  event_id?: string
  event_type?: string
  data?: PaddleBillingData
}

type PaddleBillingData = {
  id?: string | null
  status?: string | null
  customer_id?: string | null
  subscription_id?: string | null
  customer?: {
    id?: string | null
  } | null
  subscription?: {
    id?: string | null
    status?: string | null
  } | null
  custom_data?: Record<string, unknown> | null
  billing_period?: {
    ends_at?: string | null
  } | null
  current_billing_period?: {
    ends_at?: string | null
  } | null
  trial_dates?: {
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
  const rawUserId = customData?.user_id
  if (typeof rawUserId !== 'string') {
    return null
  }

  const normalized = rawUserId.trim()
  return normalized.length > 0 ? normalized : null
}

function extractPlan(customData: Record<string, unknown> | null | undefined): string | null {
  const rawPlan = customData?.plan
  if (typeof rawPlan !== 'string') {
    return null
  }

  const normalized = rawPlan.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function extractPlanPriceId(items: PaddleBillingData['items']): string | null {
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

function extractCustomerId(data: PaddleBillingData): string | null {
  const directId = data.customer_id
  if (typeof directId === 'string' && directId.trim().length > 0) {
    return directId.trim()
  }

  const nestedId = data.customer?.id
  if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
    return nestedId.trim()
  }

  return null
}

function extractSubscriptionId(data: PaddleBillingData): string | null {
  const directId = data.subscription_id
  if (typeof directId === 'string' && directId.trim().length > 0) {
    return directId.trim()
  }

  const nestedId = data.subscription?.id ?? data.id
  if (typeof nestedId === 'string' && nestedId.trim().length > 0) {
    return nestedId.trim()
  }

  return null
}

function extractPeriodEnd(data: PaddleBillingData): Date | null {
  return (
    parsePaddleDate(data.billing_period?.ends_at) ??
    parsePaddleDate(data.current_billing_period?.ends_at) ??
    parsePaddleDate(data.trial_dates?.ends_at)
  )
}

async function resolveBillingContext(data: PaddleBillingData) {
  const paddleCustomerId = extractCustomerId(data)
  const paddleSubscriptionId = extractSubscriptionId(data)

  const existingSubscription = await findSubscriptionByPaddleIdentifiers({
    paddleCustomerId,
    paddleSubscriptionId,
  })

  const userId = extractUserId(data.custom_data ?? null) ?? existingSubscription?.userId ?? null
  const planPriceId = extractPlanPriceId(data.items) ?? existingSubscription?.planPriceId ?? null
  const plan = resolvePlanForTransaction({
    explicitPlan: extractPlan(data.custom_data ?? null),
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

function statusFromEvent(eventType: string, data: PaddleBillingData): string {
  const lowered = eventType.toLowerCase()

  if (lowered === 'transaction.completed' || lowered === 'payment.succeeded') {
    return 'active'
  }

  if (lowered === 'subscription.created') {
    if (data.trial_dates?.ends_at) {
      return 'trialing'
    }

    return 'active'
  }

  if (lowered === 'subscription.activated') {
    return 'active'
  }

  if (lowered === 'payment.failed' || lowered === 'subscription.payment.failed') {
    return 'past_due'
  }

  if (lowered === 'subscription.canceled' || lowered === 'subscription.cancelled') {
    return 'canceled'
  }

  if (lowered === 'subscription.paused') {
    return 'paused'
  }

  if (typeof data.status === 'string' && data.status.trim().length > 0) {
    return data.status
  }

  if (typeof data.subscription?.status === 'string' && data.subscription.status.trim().length > 0) {
    return data.subscription.status
  }

  return 'active'
}

async function applySubscriptionMutation(eventType: string, data: PaddleBillingData): Promise<void> {
  const context = await resolveBillingContext(data)
  if (!context.userId || !context.plan) {
    return
  }

  const normalizedStatus = mapPaddleTransactionStatus(statusFromEvent(eventType, data))
  const periodEnd = extractPeriodEnd(data) ?? context.existingSubscription?.currentPeriodEnd ?? null

  await upsertSubscriptionForUser({
    userId: context.userId,
    plan: context.plan,
    status: normalizedStatus,
    planPriceId: context.planPriceId,
    paddleCustomerId: context.paddleCustomerId ?? context.existingSubscription?.paddleCustomerId ?? null,
    paddleSubscriptionId:
      context.paddleSubscriptionId ?? context.existingSubscription?.paddleSubscriptionId ?? null,
    trialEndsAt: normalizedStatus === 'trialing' ? periodEnd : context.existingSubscription?.trialEndsAt,
    currentPeriodEnd: periodEnd,
    canceledAt: normalizedStatus === 'canceled' ? new Date() : null,
  })
}

function isProcessableBillingEvent(eventType: string): boolean {
  switch (eventType) {
    case 'transaction.completed':
    case 'transaction.updated':
    case 'subscription.created':
    case 'subscription.activated':
    case 'subscription.updated':
    case 'subscription.canceled':
    case 'subscription.cancelled':
    case 'subscription.paused':
    case 'payment.succeeded':
    case 'payment.failed':
    case 'subscription.payment.failed':
      return true
    default:
      return false
  }
}

async function beginEventProcessing(params: {
  provider: 'PADDLE'
  eventId: string
  eventType: string
  payloadHash: string
}): Promise<'process' | 'skip'> {
  try {
    await prisma.billingEventLog.create({
      data: {
        provider: params.provider,
        eventId: params.eventId,
        eventType: params.eventType,
        payloadHash: params.payloadHash,
        status: 'processing',
      },
    })
    return 'process'
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.billingEventLog.findUnique({
        where: {
          provider_eventId: {
            provider: params.provider,
            eventId: params.eventId,
          },
        },
        select: {
          status: true,
        },
      })

      if (existing?.status === 'processed' || existing?.status === 'processing') {
        return 'skip'
      }

      await prisma.billingEventLog.update({
        where: {
          provider_eventId: {
            provider: params.provider,
            eventId: params.eventId,
          },
        },
        data: {
          status: 'processing',
          errorMessage: null,
          payloadHash: params.payloadHash,
          eventType: params.eventType,
        },
      })

      return 'process'
    }

    throw error
  }
}

async function finishEvent(params: {
  provider: 'PADDLE'
  eventId: string
  status: 'processed' | 'failed'
  errorMessage?: string | null
}) {
  await prisma.billingEventLog.update({
    where: {
      provider_eventId: {
        provider: params.provider,
        eventId: params.eventId,
      },
    },
    data: {
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      processedAt: params.status === 'processed' ? new Date() : null,
    },
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

  const eventType = payload.event_type?.trim() ?? ''
  const data = payload.data

  if (!eventType || !data) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const eventId =
    payload.event_id?.trim() || createHash('sha256').update(`${eventType}:${rawBody}`).digest('hex')
  const payloadHash = createHash('sha256').update(rawBody).digest('hex')

  const action = await beginEventProcessing({
    provider: 'PADDLE',
    eventId,
    eventType,
    payloadHash,
  })

  if (action === 'skip') {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    if (isProcessableBillingEvent(eventType)) {
      await applySubscriptionMutation(eventType, data)
    }

    await finishEvent({
      provider: 'PADDLE',
      eventId,
      status: 'processed',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DB ERROR:', error)

    await finishEvent({
      provider: 'PADDLE',
      eventId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    })

    throw error
  }
}
