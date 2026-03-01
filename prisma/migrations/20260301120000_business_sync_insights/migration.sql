DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SheetConnectionProvider') THEN
    CREATE TYPE "SheetConnectionProvider" AS ENUM ('GOOGLE_SHEETS');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InsightSeverity') THEN
    CREATE TYPE "InsightSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "SheetConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "SheetConnectionProvider" NOT NULL DEFAULT 'GOOGLE_SHEETS',
  "spreadsheetId" TEXT,
  "spreadsheetName" TEXT,
  "sheetName" TEXT,
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SheetConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SheetConnection_userId_key" ON "SheetConnection"("userId");
CREATE INDEX IF NOT EXISTS "SheetConnection_lastSyncedAt_idx" ON "SheetConnection"("lastSyncedAt");

CREATE TABLE IF NOT EXISTS "DataSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "summaryJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DataSnapshot_sourceId_hash_key" ON "DataSnapshot"("sourceId", "hash");
CREATE INDEX IF NOT EXISTS "DataSnapshot_userId_createdAt_idx" ON "DataSnapshot"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "DataSnapshot_sourceId_createdAt_idx" ON "DataSnapshot"("sourceId", "createdAt");

CREATE TABLE IF NOT EXISTS "InsightEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "severity" "InsightSeverity" NOT NULL DEFAULT 'INFO',
  "deltaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "InsightEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InsightEvent_sourceId_snapshotId_type_key"
  ON "InsightEvent"("sourceId", "snapshotId", "type");
CREATE INDEX IF NOT EXISTS "InsightEvent_userId_readAt_createdAt_idx"
  ON "InsightEvent"("userId", "readAt", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SheetConnection_userId_fkey'
  ) THEN
    ALTER TABLE "SheetConnection"
      ADD CONSTRAINT "SheetConnection_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DataSnapshot_userId_fkey'
  ) THEN
    ALTER TABLE "DataSnapshot"
      ADD CONSTRAINT "DataSnapshot_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DataSnapshot_sourceId_fkey'
  ) THEN
    ALTER TABLE "DataSnapshot"
      ADD CONSTRAINT "DataSnapshot_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InsightEvent_userId_fkey'
  ) THEN
    ALTER TABLE "InsightEvent"
      ADD CONSTRAINT "InsightEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InsightEvent_sourceId_fkey'
  ) THEN
    ALTER TABLE "InsightEvent"
      ADD CONSTRAINT "InsightEvent_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "SheetConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InsightEvent_snapshotId_fkey'
  ) THEN
    ALTER TABLE "InsightEvent"
      ADD CONSTRAINT "InsightEvent_snapshotId_fkey"
      FOREIGN KEY ("snapshotId") REFERENCES "DataSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
