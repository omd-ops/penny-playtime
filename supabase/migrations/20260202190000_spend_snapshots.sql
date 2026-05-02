-- SpendWise app state: one JSON snapshot row per authenticated user (use Anonymous auth in Dashboard).
-- Run in Supabase SQL Editor or via `supabase db push` if you use the Supabase CLI.

create table if not exists public.spend_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  budget_targets jsonb not null default '[]'::jsonb,
  day_flags jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"currency":"$","theme":"system"}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.spend_snapshots enable row level security;

create policy "spend_snapshots_select_own"
  on public.spend_snapshots for select
  using (auth.uid() = user_id);

create policy "spend_snapshots_insert_own"
  on public.spend_snapshots for insert
  with check (auth.uid() = user_id);

create policy "spend_snapshots_update_own"
  on public.spend_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "spend_snapshots_delete_own"
  on public.spend_snapshots for delete
  using (auth.uid() = user_id);
