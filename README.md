# Clarityboard Shopify MVP

Focused MVP for Shopify store owners:

> Upload your Shopify Orders CSV. Instantly see what is making you money.

This build is intentionally narrow:
- Input: Shopify **Orders CSV export only**
- No Google Sheets sync
- No generic Excel/CSV ingestion
- No multi-platform connectors

## What It Does

1. Upload Shopify Orders CSV
2. Clean Shopify order line items (dedupe, refunds, cancellations, currency normalization)
3. Compute core metrics only:
   - Total Revenue
   - Total Orders
   - AOV
   - Total Units Sold
   - Top 5 Products by Revenue
   - Revenue Trend (7d / 30d)
   - Optional Estimated Profit (only when cost data exists)
4. Enforce billing:
   - 7-day free trial
   - Paddle-only subscription gate

## Shopify-Specific Cleaning Rules

- Validates Shopify Orders CSV structure via required Shopify headers
- Handles multiple line items per order
- Excludes cancelled orders by default (dashboard toggle can include them)
- Accounts for refunded amounts at order level
- Normalizes currency values into USD for consistent KPI output
- Removes empty rows
- Deduplicates repeated line items using stable row hashes
- Trims whitespace and normalizes text
- Merges duplicate SKUs in top-product ranking
- Handles variant titles (`Default Title` ignored)

## Routes

- Landing: `/`
- Upload: `/upload`
- Dashboard: `/dashboard`
- Demo dashboard (no signup): `/dashboard?demo=1`
- Pricing: `/pricing`

API:
- `POST /api/datasets/upload` (Shopify Orders CSV only)
- `GET /api/shopify/summary`
- `GET /api/shopify/demo-summary`
- `POST /api/webhooks/paddle`

Disabled in this MVP:
- `/reports/*`
- `/api/reports/*`
- `/api/cron/*`

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:
- Copy `.env.example` to `.env.local`
- Fill required values

3. Run Prisma:

```bash
pnpm prisma migrate dev
pnpm run prisma:generate:auto
```

4. Start app:

```bash
pnpm dev
```

## Paddle Setup

Configure in Paddle:
- Product/price for single Shopify plan ($25/month)
- Webhook endpoint:
  - `POST https://<your-domain>/api/webhooks/paddle`
  - Use `PADDLE_WEBHOOK_SECRET`

Required env keys:
- `PADDLE_VENDOR_ID`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `NEXT_PUBLIC_PADDLE_PRICE_BASIC_ID`

## Demo Data

Bundled demo CSV:
- `tests/fixtures/shopify-orders-demo.csv`

Used by:
- `GET /api/shopify/demo-summary`
- “Try Demo Data” CTA on landing page

## Testing

Unit tests:

```bash
pnpm test
```

Shopify e2e (required):

```bash
pnpm test:e2e
```

Legacy e2e (quarantined, non-blocking):

```bash
pnpm test:e2e:legacy
```

## Release Checklist

Required checks:

1. `pnpm lint`
2. `pnpm exec tsc --noEmit`
3. `pnpm test`
4. `pnpm test:e2e`
5. `pnpm build`

Production setup:

1. Apply Prisma migrations in production
2. Configure all required env vars
3. Configure Paddle webhook (`/api/webhooks/paddle`)
4. Deploy to Vercel
