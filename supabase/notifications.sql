-- Run this once in the Supabase SQL editor (in addition to schema.sql).

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

create index if not exists notifications_user_idx on notifications (user_email, created_at desc);
create index if not exists booking_attendees_user_idx on booking_attendees (user_email);

alter table booking_attendees enable row level security;
alter table notifications enable row level security;
