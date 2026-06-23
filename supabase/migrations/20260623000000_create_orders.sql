create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
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

alter table public.orders
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists orders_user_id_created_at_idx
on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

drop policy if exists "anon can read demo orders" on public.orders;
drop policy if exists "anon can insert demo orders" on public.orders;
drop policy if exists "anon can update demo orders" on public.orders;
drop policy if exists "users can read own orders" on public.orders;
drop policy if exists "users can insert own orders" on public.orders;
drop policy if exists "users can update own orders" on public.orders;

create policy "users can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

create policy "users can insert own orders"
on public.orders
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users can update own orders"
on public.orders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
