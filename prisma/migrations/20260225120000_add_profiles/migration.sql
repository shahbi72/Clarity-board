CREATE TABLE IF NOT EXISTS "profiles" (
  "user_id" TEXT PRIMARY KEY,
  "first_name" TEXT,
  "last_name" TEXT,
  "company_name" TEXT,
  "company_size" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "profiles_language_idx" ON "profiles" ("language");

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY "profiles_select_own"
      ON "profiles"
      FOR SELECT
      USING ((auth.uid())::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own"
      ON "profiles"
      FOR INSERT
      WITH CHECK ((auth.uid())::text = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY "profiles_update_own"
      ON "profiles"
      FOR UPDATE
      USING ((auth.uid())::text = user_id)
      WITH CHECK ((auth.uid())::text = user_id);
  END IF;
END;
$$;
