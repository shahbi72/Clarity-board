ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "plan" TEXT;

UPDATE "subscriptions"
SET "plan" = 'basic'
WHERE "plan" IS NULL;

ALTER TABLE "subscriptions"
ALTER COLUMN "plan" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "ai_insight_usage" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "month_key" TEXT NOT NULL,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_insight_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_insight_usage_user_id_month_key_key"
  ON "ai_insight_usage"("user_id", "month_key");

CREATE INDEX IF NOT EXISTS "ai_insight_usage_user_id_idx"
  ON "ai_insight_usage"("user_id");
