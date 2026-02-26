ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS "profiles_role_idx" ON "profiles" ("role");

UPDATE "profiles"
SET "role" = 'user'
WHERE "role" IS NULL OR btrim("role") = '';

REVOKE UPDATE ("role") ON TABLE "profiles" FROM anon;
REVOKE UPDATE ("role") ON TABLE "profiles" FROM authenticated;
