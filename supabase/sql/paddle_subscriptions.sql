-- Clarityboard Paddle subscriptions table + RLS (run in Supabase SQL editor)

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('basic', 'pro', 'business')),
  plan_price_id text,
  provider text not null default 'PADDLE' check (provider = 'PADDLE'),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  paddle_customer_id text,
  paddle_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_paddle_customer_id_key
  on public.subscriptions (paddle_customer_id)
  where paddle_customer_id is not null;

create unique index if not exists subscriptions_paddle_subscription_id_key
  on public.subscriptions (paddle_subscription_id)
  where paddle_subscription_id is not null;

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create table if not exists public.billing_event_logs (
  id text primary key,
  provider text not null check (provider = 'PADDLE'),
  event_id text not null,
  event_type text not null,
  payload_hash text,
  status text not null default 'processing',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_event_logs_provider_event_id_key
  on public.billing_event_logs (provider, event_id);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can select own subscription" on public.subscriptions;
create policy "Users can select own subscription"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role can insert subscriptions" on public.subscriptions;
create policy "Service role can insert subscriptions"
  on public.subscriptions
  for insert
  to service_role
  with check (true);

drop policy if exists "Service role can update subscriptions" on public.subscriptions;
create policy "Service role can update subscriptions"
  on public.subscriptions
  for update
  to service_role
  using (true)
  with check (true);
