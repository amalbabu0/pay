create table if not exists public.orders (
  id text primary key,
  status text not null check (status in ('pending', 'success', 'failed', 'cancelled')),
  order_number text default '',
  gateway_order_id text default '',
  payment_id text default '',
  amount_paise integer not null default 0,
  message text default '',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "anon can read demo orders" on public.orders;
drop policy if exists "anon can insert demo orders" on public.orders;
drop policy if exists "anon can update demo orders" on public.orders;

create policy "anon can read demo orders"
on public.orders
for select
to anon
using (true);

create policy "anon can insert demo orders"
on public.orders
for insert
to anon
with check (true);

create policy "anon can update demo orders"
on public.orders
for update
to anon
using (true)
with check (true);
