-- Run once in Supabase SQL editor before deploying the groups UI.
begin;
create table if not exists public.attendee_groups (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null references public.users(email) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists attendee_groups_owner_name_idx
  on public.attendee_groups(owner_email, lower(btrim(name)));
create table if not exists public.attendee_group_members (
  group_id uuid not null references public.attendee_groups(id) on delete cascade,
  user_email text not null references public.users(email) on delete cascade,
  primary key(group_id, user_email)
);
alter table public.attendee_groups enable row level security;
alter table public.attendee_group_members enable row level security;
revoke all on public.attendee_groups, public.attendee_group_members from anon, authenticated;
grant all on public.attendee_groups, public.attendee_group_members to service_role;

-- Service-only operation: the API supplies the verified owner, never a client owner.
create or replace function public.save_attendee_group(
  p_owner_email text, p_name text, p_member_emails text[], p_group_id uuid default null
) returns jsonb language plpgsql set search_path = public as $$
declare
  v_id uuid;
  v_emails text[];
begin
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80
    or coalesce(cardinality(p_member_emails), 0) not between 1 and 500 then
    return jsonb_build_object('ok', false, 'message', 'Enter a name and select 1–500 members.');
  end if;
  if p_group_id is not null then
    select id into v_id from attendee_groups
      where id = p_group_id and owner_email = p_owner_email for update;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'Group not found.');
    end if;
  end if;
  select array_agg(distinct lower(btrim(e))) into v_emails from unnest(p_member_emails) e;
  if exists (select 1 from unnest(v_emails) e where e is null or not exists (
    select 1 from users u where u.email = e and u.active
  )) then
    return jsonb_build_object('ok', false, 'message', 'Some members are no longer available. Refresh the directory and try again.');
  end if;
  if p_group_id is null then
    insert into attendee_groups(owner_email, name) values(p_owner_email, btrim(p_name)) returning id into v_id;
  else
    update attendee_groups set name = btrim(p_name), updated_at = now() where id = v_id;
    delete from attendee_group_members where group_id = v_id;
  end if;
  insert into attendee_group_members(group_id, user_email) select v_id, unnest(v_emails);
  return jsonb_build_object('ok', true, 'id', v_id);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'message', 'You already have a group with this name.');
end;
$$;
revoke all on function public.save_attendee_group(text, text, text[], uuid) from public, anon, authenticated;
grant execute on function public.save_attendee_group(text, text, text[], uuid) to service_role;
commit;
