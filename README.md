# ClarityBoard UI Build

## Environment Setup

Create `.env.local` in project root:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
DEMO_USER_ID="demo-user"
```

Use your Supabase pooler connection string (`:6543` with `sslmode=require`).
Do not use `db.<ref>.supabase.co:5432` if network access is blocked; use the pooler host.

## Prisma

`prisma/schema.prisma` is configured for PostgreSQL.
Run migrations against your Supabase database:

`pnpm prisma migrate dev --name init`

## Vercel Production Variables

Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` = Supabase Postgres pooler URL (`:6543`, `sslmode=require`)
- `DEMO_USER_ID` = stable app user id (for demo mode)
