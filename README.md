# Clarityboard Shopify MVP

Focused MVP for Shopify store owners:

> Upload your Shopify Orders export. Instantly see what is making you money.

## Plans

- Starter ($29/mo): Shopify Orders CSV upload + basic insights + AI Copilot (10 questions/day).
- Business ($39/mo): Starter + Google Sheets live sync, change insights, notification bell, unlimited AI Copilot.
- Billing source of truth: Paddle only.

## Core Features

1. Shopify Orders CSV ingestion and cleaning
2. Core KPIs: revenue, orders, AOV, units sold, top 5 products, 7d/30d trend
3. AI Store Health Monitor:
   - Problem-first insights (what changed / what needs attention)
   - Daily/per-sync anomaly detection and InsightEvents
   - Profit estimator: refunds, COGS, fees, shipping, margin checks
   - Dead stock and best day/time insights
4. 7-day trial paywall enforcement
5. Business live sync:
   - Connect Google via OAuth (Sheets/Drive read-only scopes)
   - Select one spreadsheet/sheet per user
   - Manual refresh + cron polling every 5 minutes
   - Snapshot diffing and InsightEvent notifications + bell inbox

## API Surface

- `POST /api/datasets/upload`
- `GET /api/shopify/summary`
- `GET /api/shopify/demo-summary`
- `POST /api/shopify/copilot`
- `POST /api/webhooks/paddle`

Business sync APIs:
- `GET /api/business/status`
- `GET /api/business/google/connect`
- `GET /api/business/google/callback`
- `GET /api/business/google/spreadsheets`
- `GET /api/business/google/spreadsheets/:spreadsheetId/sheets`
- `POST /api/business/google/select`
- `POST /api/business/sync/refresh`
- `GET /api/business/insights`
- `POST /api/business/insights/read`
- `POST /api/cron/sync` (`x-cron-secret` required)
- `POST /api/cron/business-sync` (`x-cron-secret` required, legacy alias)

Legacy reports surface remains disabled:
- `/reports/*`
- `/api/reports/*`
- `/api/cron/*` (except `/api/cron/business-sync`)

## Local Setup

1. Install dependencies

```bash
pnpm install
```

2. Configure `.env.local` from `.env.example`

3. Run Prisma

```bash
pnpm prisma migrate dev
pnpm run prisma:generate:auto
```

4. Start app

```bash
pnpm dev
```

## Required Env Vars

App + DB:
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL` (Supabase pooler / PgBouncer, port `6543`)
- `DIRECT_URL` (Supabase direct connection, port `5432`, used by Prisma migrations)
- `PRISMA_DISABLE_POSTGRESQL_PREPARED_STATEMENTS=true` (recommended with PgBouncer)

Production requirement (Vercel + Supabase + Prisma):

```env
DATABASE_URL="postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<project-ref>:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
PRISMA_DISABLE_POSTGRESQL_PREPARED_STATEMENTS=true
```

If your database password contains special characters (for example `@`, `:`, `/`, `?`, `#`, `%`), URL-encode it in both URLs.

## Production Prisma Deploy (Supabase)

This repo already has Prisma migrations in `prisma/migrations`, so production should use:

```powershell
$env:DIRECT_URL="postgresql://postgres.<project-ref>:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:DATABASE_URL=$env:DIRECT_URL
pnpm prisma migrate deploy
```

If a project does not have a `prisma/migrations` folder yet, use:

```powershell
$env:DIRECT_URL="postgresql://postgres.<project-ref>:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:DATABASE_URL=$env:DIRECT_URL
pnpm prisma db push
```

Auth:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Paddle:
- `PADDLE_VENDOR_ID`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID` (Starter $29)
- `NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_ID` (Business $39)

Business sync:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TOKEN_ENC_KEY` (32-byte base64 or 64-char hex)
- `CRON_SECRET`

## Google OAuth Setup

1. In Google Cloud Console, create OAuth credentials.
2. Add redirect URI:
   - `https://<your-domain>/api/business/google/callback`
3. Enable APIs:
   - Google Drive API
   - Google Sheets API
4. Keep scopes read-only (configured in app):
   - `spreadsheets.readonly`
   - `drive.readonly`

## Paddle Setup

1. Create Starter and Business prices in Paddle.
2. Configure webhook endpoint:
   - `POST https://<your-domain>/api/webhooks/paddle`
3. Set `PADDLE_WEBHOOK_SECRET`.

## Vercel Cron Setup

Configure a 5-minute schedule calling:
- `POST https://<your-domain>/api/cron/sync`
- Header: `x-cron-secret: <CRON_SECRET>`

## Demo Data

- `tests/fixtures/shopify-orders-demo.csv`
- Demo route: `GET /api/shopify/demo-summary`

## Testing

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm test:e2e
pnpm build
```

## Release Checklist

Required checks:
1. `pnpm lint`
2. `pnpm exec tsc --noEmit`
3. `pnpm test`
4. `pnpm test:e2e`
5. `pnpm build`

Production setup:
1. Apply Prisma migrations
2. Configure env vars
3. Configure Paddle webhook
4. Configure Vercel cron with `CRON_SECRET`
