# Clarityboard Reports

Production-ready multi-tenant B2B SaaS module for connecting Google Sheets, continuously syncing + cleaning data, inferring KPIs, rendering live dashboards, and emailing scheduled weekly PDF reports.

## Stack

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma
- Auth: NextAuth (Google OAuth, credentials hook prepared)
- Billing: Paddle only (7-day trial + webhook-driven subscription state)
- Email: Resend
- Jobs: Vercel Cron (`/api/cron/sync`, `/api/cron/reports`)

## Billing Architecture (Paddle Only)

- Checkout is handled by Paddle.js from `/pricing`.
- Webhooks are handled at `POST /api/webhooks/paddle` with signature verification.
- Subscription source-of-truth is `subscriptions` with `provider = PADDLE`.
- Idempotency is enforced with `BillingEventLog` (`@@unique([provider, eventId])`).
- Reports paywall and cron gating only accept Paddle-backed active/trialing subscriptions.

## Implemented Core Modules

1. Auth + tenant bootstrap
- NextAuth Google sign-in with Sheets/Drive readonly scopes.
- Auto-provisions `User`, `Workspace`, `WorkspaceMember`, and trial `Subscription`.

2. Google Sheets picker
- List spreadsheets: `GET /api/reports/google/spreadsheets`
- List tabs: `GET /api/reports/google/spreadsheets/:spreadsheetId/sheets`

3. Ingestion pipeline
- Pull values from Google Sheets.
- Infer header row.
- Normalize rows.
- Store raw snapshot in `SyncRun`.
- Store cleaned rows in `CleanTable`.
- Incremental upsert using `RowHash`.

4. Cleaning engine
- Trim whitespace.
- Normalize headers.
- Remove empty rows.
- Parse dates and numeric/currency values.
- Detect duplicates.
- Infer column types + confidence.

5. KPI inference
- Detect date, revenue/sales, cost/spend, orders, profit, conversion rate.
- Persist `KpiMapping`.
- Allow manual override via API.

6. Dashboard
- KPI cards.
- Week-over-week deltas.
- Trend table.
- Date range filter.
- Loading/empty/error/paywall states.

7. Report generation + email
- Server-side PDF generation (`pdfkit`).
- Email send (Resend).
- Persist sent report metadata (`Report`).

8. Scheduling + cron
- Weekly schedule API/UI (`ReportSchedule`).
- Default Monday 09:00 Europe/Istanbul.
- Cron jobs:
  - `POST /api/cron/sync`
  - `POST /api/cron/reports`

9. Billing + paywall
- Paddle checkout via client integration (`/pricing`).
- Paddle webhook status updates with idempotency.
- 7-day trial enforcement.
- Dashboard/report sending locked when trial expired or subscription inactive.
- Sync/report cron skips non-active subscriptions.

10. Admin + compliance
- Disconnect Google (revoke token, stop jobs).
- Data export endpoint.
- Data delete endpoint.
- Audit logs for security-sensitive actions.

## Data Model (Prisma)

Models added/extended:

- `User`
- `Workspace`
- `WorkspaceMember`
- `Connection`
- `Dataset`
- `SheetSource`
- `SyncRun`
- `RowHash`
- `CleanTable`
- `KpiMapping`
- `Report`
- `ReportSchedule`
- `Subscription`
- `BillingEventLog`
- `AuditLog`
- NextAuth support models: `Account`, `Session`, `VerificationToken`

## Security

- OAuth access/refresh tokens encrypted at rest using AES-256-GCM (`TOKEN_ENC_KEY`).
- Zod validation on Reports APIs.
- Consistent API error envelope.
- Server-side rate limiting.
- Privacy-safe structured logging (token/sheet payload redaction).
- Audit logging.
- Paddle webhook signature verification + idempotent event processing.

## Required Environment Variables

Copy `.env.example` to `.env.local` and fill:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `TOKEN_ENC_KEY`
- `CRON_SECRET`
- `PADDLE_VENDOR_ID`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PADDLE_ENV`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID`
- `NEXT_PUBLIC_PADDLE_PRICE_PRO_ID`
- `NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_ID`
- `NEXT_PUBLIC_PADDLE_MANAGEMENT_URL`
- `RESEND_API_KEY`
- `REPORTS_FROM_EMAIL`

Optional for demo auth/e2e:

- `REPORTS_DEMO_AUTH=1`
- `NEXT_PUBLIC_REPORTS_DEMO_AUTH=1`

## Local Setup

1. Install Node 20.x and pnpm 9.x.
2. Install deps:

```bash
pnpm install
```

3. Apply migrations:

```bash
pnpm prisma migrate dev
```

4. Generate Prisma client:

```bash
pnpm run prisma:generate:auto
```

5. Start dev server:

```bash
pnpm dev
```

6. Open:

- Reports login: `http://localhost:3000/reports/login`
- Reports dashboard: `http://localhost:3000/reports/dashboard`
- Pricing/Paddle checkout: `http://localhost:3000/pricing`

## Google OAuth Setup

1. Google Cloud Console -> create OAuth client (Web Application).
2. Authorized redirect URIs:

- `http://localhost:3000/api/auth/callback/google`
- `https://<your-domain>/api/auth/callback/google`

3. Enable APIs:

- Google Drive API
- Google Sheets API

4. Scopes used:

- `https://www.googleapis.com/auth/spreadsheets.readonly`
- `https://www.googleapis.com/auth/drive.readonly`

## Paddle Setup

1. Configure Paddle product prices and set `NEXT_PUBLIC_PADDLE_PRICE_*` IDs.
2. Configure Paddle.js client token (`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`).
3. Configure API credentials (`PADDLE_VENDOR_ID`, `PADDLE_API_KEY`).
4. Configure webhook endpoint:

- URL: `https://<your-domain>/api/webhooks/paddle`
- Secret: `PADDLE_WEBHOOK_SECRET`

5. Ensure checkout custom data includes `user_id` and `plan` (already implemented in pricing checkout code).

## Cron Setup (Vercel)

Add two cron jobs in `vercel.json` or Vercel UI:

- `/api/cron/sync` (e.g. every 30 minutes)
- `/api/cron/reports` (e.g. every 15 minutes)

Send header:

- `x-cron-secret: <CRON_SECRET>`

## Example Demo Spreadsheet

Headers:

- `Date`
- `Sales`
- `Cost`
- `Orders`
- `Conversion Rate`

Example rows:

- `2026-01-20, 1200.50, 700.00, 21, 0.12`
- `2026-01-21, 1600.00, 900.00, 28, 0.15`

Connect flow:

1. Sign in via `/reports/login`.
2. Open `/reports/connect`.
3. Search/select spreadsheet + tab.
4. Click `Connect and Sync`.
5. Open `/reports/dashboard`.

## API Surface (Reports)

- Auth: `GET/POST /api/auth/[...nextauth]`
- Google picker:
  - `GET /api/reports/google/spreadsheets`
  - `GET /api/reports/google/spreadsheets/:spreadsheetId/sheets`
- Sources:
  - `GET /api/reports/sheet-sources`
  - `POST /api/reports/sheet-sources`
  - `POST /api/reports/sheet-sources/:sheetSourceId/sync`
- Dashboard:
  - `GET /api/reports/dashboard/summary`
- KPI mapping:
  - `GET /api/reports/kpi-mapping/:datasetId`
  - `PATCH /api/reports/kpi-mapping/:datasetId`
- Scheduling + reports:
  - `GET/PUT /api/reports/schedule`
  - `GET /api/reports/reports`
  - `POST /api/reports/reports/send`
- Billing status:
  - `GET /api/reports/billing/status`
- Paddle webhook:
  - `POST /api/webhooks/paddle`
- Compliance/admin:
  - `POST /api/reports/google/disconnect`
  - `GET /api/reports/compliance/export`
  - `DELETE /api/reports/compliance/delete`
- Health:
  - `GET /api/health`

## Testing

Unit tests:

```bash
pnpm test
```

Reports-specific unit tests:

- `tests/reports-cleaning.test.ts`
- `tests/reports-kpi-inference.test.ts`

E2E smoke:

```bash
pnpm test:e2e:reports
```

## Deployment (Vercel + Managed Postgres)

1. Provision Postgres (Neon/Supabase).
2. Set all env vars in Vercel.
3. Run migrations against production DB.
4. Deploy app.
5. Configure Paddle webhook and Vercel cron.
6. Verify `/api/health` returns `status: ok`.

## Release Checklist

Required checks:

1. `pnpm lint`
2. `pnpm exec tsc --noEmit`
3. `pnpm test`
4. `pnpm test:e2e:reports`
5. `pnpm build`

Production setup:

1. Run Prisma migrations in production.
2. Verify required environment variables are set.
3. Configure Paddle webhook at `POST /api/webhooks/paddle`.
4. Configure Vercel cron routes with `x-cron-secret` using `CRON_SECRET`.
