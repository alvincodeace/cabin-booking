-- Run this in the Supabase SQL editor once.

create extension if not exists pgcrypto;

create table if not exists users (
  email text primary key,
  name text not null,
  employee_id text not null default '',
  department text not null default '',
  role text not null default 'EMPLOYEE' check (role in ('ADMIN', 'TEAM_LEAD', 'EMPLOYEE')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists cabins (
  cabin_id text primary key,
  cabin_name text not null,
  location text not null default '',
  capacity integer not null default 4,
  description text not null default '',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  booking_id text primary key,
  cabin_id text not null references cabins(cabin_id),
  cabin_name text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  booked_by text not null,
  booked_by_email text not null references users(email),
  department text not null default '',
  purpose text not null default '',
  status text not null default 'BOOKED' check (status in ('BOOKED', 'CANCELLED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists locks (
  lock_id text primary key,
  cabin_id text not null references cabins(cabin_id),
  date date not null,
  start_time text not null,
  end_time text not null,
  user_email text not null references users(email),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists settings (
  id integer primary key default 1 check (id = 1),
  lock_duration_minutes integer not null default 5,
  max_booking_duration_minutes integer not null default 60,
  advance_booking_days integer not null default 30
);

create table if not exists booking_attendees (
  booking_id text not null references bookings(booking_id) on delete cascade,
  user_email text not null references users(email),
  name text not null default '',
  created_at timestamptz not null default now(),
  primary key (booking_id, user_email)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references users(email),
  booking_id text,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists bookings_cabin_date_idx on bookings (cabin_id, date);
create index if not exists bookings_user_idx on bookings (booked_by_email);
create index if not exists locks_cabin_date_idx on locks (cabin_id, date);
create index if not exists locks_expires_idx on locks (expires_at);
create index if not exists notifications_user_idx on notifications (user_email, created_at desc);
create index if not exists booking_attendees_user_idx on booking_attendees (user_email);

alter table users enable row level security;
alter table cabins enable row level security;
alter table bookings enable row level security;
alter table locks enable row level security;
alter table settings enable row level security;
alter table booking_attendees enable row level security;
alter table notifications enable row level security;

insert into settings (id, lock_duration_minutes, max_booking_duration_minutes, advance_booking_days)
values (1, 5, 60, 30)
on conflict (id) do nothing;

insert into cabins (cabin_id, cabin_name, location, capacity, description, status)
values
  ('CABIN_01', 'Cabin 01', '1st Floor', 4, 'Small meeting room with whiteboard', 'ACTIVE'),
  ('CABIN_02', 'Cabin 02', '2nd Floor', 6, 'Medium meeting room with projector', 'ACTIVE'),
  ('CABIN_03', 'Cabin 03', '3rd Floor', 8, 'Large conference room with video conferencing', 'ACTIVE')
on conflict (cabin_id) do nothing;

insert into users (email, name, employee_id, department, role, active)
values ('alvinksabu@codeace.com', 'Alvin K Sabu', 'EMP001', 'IT', 'ADMIN', true)
on conflict (email) do update
set name = excluded.name,
    role = 'ADMIN',
    active = true;

create or replace function times_overlap(start1 text, end1 text, start2 text, end2 text)
returns boolean
language sql
immutable
as $$
  select start1 < end2 and end1 > start2;
$$;

create or replace function create_booking_lock(
  p_cabin_id text,
  p_date date,
  p_start_time text,
  p_end_time text,
  p_user_email text,
  p_lock_duration_minutes integer
)
returns jsonb
language plpgsql
as $$
declare
  v_lock_id text;
  v_expires_at timestamptz;
  v_booked integer;
  v_locked integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_cabin_id || ':' || p_date::text));

  delete from locks where expires_at <= now();

  select count(*) into v_booked
  from bookings
  where cabin_id = p_cabin_id
    and date = p_date
    and status = 'BOOKED'
    and times_overlap(p_start_time, p_end_time, start_time, end_time);

  if v_booked > 0 then
    return jsonb_build_object('ok', false, 'code', 'SLOT_BOOKED', 'message', 'This time slot is already booked');
  end if;

  select count(*) into v_locked
  from locks
  where cabin_id = p_cabin_id
    and date = p_date
    and expires_at > now()
    and times_overlap(p_start_time, p_end_time, start_time, end_time);

  if v_locked > 0 then
    return jsonb_build_object('ok', false, 'code', 'SLOT_LOCKED', 'message', 'This time slot is currently being booked by another user');
  end if;

  v_lock_id := 'LOCK_' || replace(gen_random_uuid()::text, '-', '');
  v_expires_at := now() + make_interval(mins => p_lock_duration_minutes);

  insert into locks (lock_id, cabin_id, date, start_time, end_time, user_email, expires_at)
  values (v_lock_id, p_cabin_id, p_date, p_start_time, p_end_time, p_user_email, v_expires_at);

  return jsonb_build_object(
    'ok', true,
    'lockId', v_lock_id,
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function confirm_booking_from_lock(
  p_lock_id text,
  p_user_email text,
  p_user_name text,
  p_department text,
  p_purpose text
)
returns jsonb
language plpgsql
as $$
declare
  v_lock locks%rowtype;
  v_cabin cabins%rowtype;
  v_booked integer;
  v_booking_id text;
  v_now timestamptz;
begin
  v_now := now();

  select * into v_lock from locks where lock_id = p_lock_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'LOCK_NOT_FOUND', 'message', 'Lock not found or has expired');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_lock.cabin_id || ':' || v_lock.date::text));

  select * into v_lock from locks where lock_id = p_lock_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'LOCK_NOT_FOUND', 'message', 'Lock not found or has expired');
  end if;

  if v_lock.user_email <> p_user_email then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED', 'message', 'This lock belongs to another user');
  end if;

  if v_lock.expires_at <= v_now then
    delete from locks where lock_id = p_lock_id;
    return jsonb_build_object('ok', false, 'code', 'LOCK_EXPIRED', 'message', 'Lock has expired');
  end if;

  select * into v_cabin from cabins where cabin_id = v_lock.cabin_id;
  if not found or v_cabin.status <> 'ACTIVE' then
    return jsonb_build_object('ok', false, 'code', 'CABIN_UNAVAILABLE', 'message', 'Cabin is no longer available');
  end if;

  select count(*) into v_booked
  from bookings
  where cabin_id = v_lock.cabin_id
    and date = v_lock.date
    and status = 'BOOKED'
    and times_overlap(v_lock.start_time, v_lock.end_time, start_time, end_time);

  if v_booked > 0 then
    return jsonb_build_object('ok', false, 'code', 'SLOT_NO_LONGER_AVAILABLE', 'message', 'This time slot was just booked by another user');
  end if;

  v_booking_id := 'BOOKING_' || replace(gen_random_uuid()::text, '-', '');

  insert into bookings (
    booking_id, cabin_id, cabin_name, date, start_time, end_time,
    booked_by, booked_by_email, department, purpose, status, created_at, updated_at
  ) values (
    v_booking_id, v_lock.cabin_id, v_cabin.cabin_name, v_lock.date, v_lock.start_time, v_lock.end_time,
    p_user_name, p_user_email, p_department, coalesce(p_purpose, ''), 'BOOKED', v_now, v_now
  );

  delete from locks where lock_id = p_lock_id;

  return jsonb_build_object(
    'ok', true,
    'booking', jsonb_build_object(
      'bookingId', v_booking_id,
      'cabinId', v_lock.cabin_id,
      'cabinName', v_cabin.cabin_name,
      'date', v_lock.date,
      'startTime', v_lock.start_time,
      'endTime', v_lock.end_time,
      'bookedBy', p_user_name,
      'bookedByEmail', p_user_email,
      'department', p_department,
      'purpose', coalesce(p_purpose, ''),
      'status', 'BOOKED',
      'createdAt', v_now,
      'updatedAt', v_now
    )
  );
end;
$$;

revoke all on function times_overlap(text, text, text, text) from public;
revoke all on function create_booking_lock(text, date, text, text, text, integer) from public;
revoke all on function confirm_booking_from_lock(text, text, text, text, text) from public;
grant execute on function times_overlap(text, text, text, text) to service_role;
grant execute on function create_booking_lock(text, date, text, text, text, integer) to service_role;
grant execute on function confirm_booking_from_lock(text, text, text, text, text) to service_role;
