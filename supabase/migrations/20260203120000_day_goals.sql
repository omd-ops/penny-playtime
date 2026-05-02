-- Extra per-day goals (beyond the default "met daily target" flag). Safe if already applied.
alter table public.spend_snapshots
  add column if not exists day_goals jsonb not null default '[]'::jsonb;
