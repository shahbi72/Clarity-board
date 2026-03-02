ALTER TABLE "InsightEvent"
  ADD COLUMN IF NOT EXISTS "periodKey" TEXT;

UPDATE "InsightEvent"
SET "periodKey" = COALESCE(NULLIF("periodKey", ''), CONCAT('snapshot:', "snapshotId"))
WHERE "periodKey" IS NULL OR "periodKey" = '';

ALTER TABLE "InsightEvent"
  ALTER COLUMN "periodKey" SET NOT NULL;

DROP INDEX IF EXISTS "InsightEvent_sourceId_snapshotId_type_key";
CREATE UNIQUE INDEX IF NOT EXISTS "InsightEvent_sourceId_periodKey_type_key"
  ON "InsightEvent"("sourceId", "periodKey", "type");

CREATE TABLE IF NOT EXISTS "ai_copilot_usage" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "date_key" TEXT NOT NULL,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_copilot_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_copilot_usage_user_id_date_key_key"
  ON "ai_copilot_usage"("user_id", "date_key");
CREATE INDEX IF NOT EXISTS "ai_copilot_usage_user_id_idx"
  ON "ai_copilot_usage"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_copilot_usage_user_id_fkey'
  ) THEN
    ALTER TABLE "ai_copilot_usage"
      ADD CONSTRAINT "ai_copilot_usage_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
