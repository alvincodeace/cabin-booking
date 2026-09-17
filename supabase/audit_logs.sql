-- Run this once in the Supabase SQL editor (existing projects).
-- New installs already get this from schema.sql.

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_email text not null default '',
  actor_name text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  summary text not null default ''
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_email);
create index if not exists audit_logs_action_idx on audit_logs (action);

alter table audit_logs enable row level security;
