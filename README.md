# ClarityBoard UI Build

## Environment Setup

Create `.env.local` in project root:

```bash
DATABASE_URL="file:./dev.db"
DEMO_USER_ID="demo-user"
```

`DATABASE_URL="file:./dev.db"` keeps local development on SQLite (`prisma/dev.db`).

## Prisma Schema Selection

Prisma client generation is automatic from `DATABASE_URL`:

- SQLite URL -> `prisma/schema.prisma`
- Postgres URL -> `prisma/schema.postgres.prisma`

Scripts:

```bash
pnpm prisma:generate            # force SQLite client
pnpm prisma:generate:postgres   # force Postgres client
pnpm prisma:push:postgres       # apply schema to Postgres
```

## Vercel Production Variables

Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` = your Postgres connection string
- `DEMO_USER_ID` = stable app user id (for demo mode)

Recommended providers:

- Vercel Postgres
- Supabase Postgres

## Migrating Off SQLite On Vercel

If deployment currently points to SQLite-like/local storage:

1. Provision a managed Postgres database.
2. Set `DATABASE_URL` in Vercel to the Postgres URL.
3. Apply schema once:
   `pnpm prisma:push:postgres`
4. Redeploy.
5. Validate flows:
   upload -> datasets activation -> dashboard refresh -> suggestions refresh.
