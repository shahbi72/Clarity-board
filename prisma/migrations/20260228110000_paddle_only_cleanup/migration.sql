-- Enforce Paddle-only subscription fields and add idempotent billing event log.
ALTER TABLE "subscriptions"
  ALTER COLUMN "provider" SET DEFAULT 'PADDLE';

ALTER TABLE "subscriptions"
  DROP COLUMN IF EXISTS "stripe_customer_id",
  DROP COLUMN IF EXISTS "stripe_subscription_id",
  DROP COLUMN IF EXISTS "stripe_price_id";

DROP INDEX IF EXISTS "subscriptions_stripe_customer_id_idx";
DROP INDEX IF EXISTS "subscriptions_stripe_subscription_id_idx";

CREATE TABLE IF NOT EXISTS "BillingEventLog" (
  "id" TEXT NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "errorMessage" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingEventLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingEventLog_provider_eventId_key"
  ON "BillingEventLog"("provider", "eventId");

CREATE INDEX IF NOT EXISTS "BillingEventLog_provider_createdAt_idx"
  ON "BillingEventLog"("provider", "createdAt");
