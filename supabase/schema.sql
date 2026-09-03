-- Pinterest Auto Bot — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).

create extension if not exists "pgcrypto";

-- Singleton settings row (id is always 1). Holds Pinterest OAuth tokens,
-- default board, and generation preferences. Single-user app, so one row.
create table if not exists app_settings (
  id smallint primary key default 1,
  pinterest_access_token text,
  pinterest_refresh_token text,
  pinterest_token_expires_at timestamptz,
  pinterest_username text,
  default_board_id text,
  default_board_name text,
  image_source text not null default 'ai',        -- 'ai' | 'stock' | 'mixed'
  utm_suffix text default '',
  auto_post_enabled boolean not null default false,
  posts_per_day smallint not null default 3,
  posting_hours int[] not null default '{9,13,18}', -- local hours (0-23) the queue is allowed to fire
  timezone text not null default 'Asia/Karachi',
  last_auto_post_at timestamptz, -- prevents the autopilot firing twice in one posting-hour slot
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into app_settings (id) values (1) on conflict (id) do nothing;

-- One row per generated/queued/posted pin.
create table if not exists pins (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  title text not null,
  description text not null,
  hashtags text[] not null default '{}',
  image_url text not null,          -- final image used (pollinations/pexels URL or Supabase Storage URL)
  image_source text not null,       -- 'ai' | 'stock'
  destination_url text,             -- optional link the pin points to
  board_id text,
  board_name text,
  status text not null default 'draft', -- 'draft' | 'scheduled' | 'posted' | 'failed'
  scheduled_at timestamptz,
  posted_at timestamptz,
  pinterest_pin_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists pins_status_scheduled_idx on pins (status, scheduled_at);
create index if not exists pins_created_idx on pins (created_at desc);

-- Cached list of the connected account's boards (refreshed on demand).
create table if not exists boards_cache (
  board_id text primary key,
  name text not null,
  privacy text,
  fetched_at timestamptz not null default now()
);

-- Public bucket the app re-hosts every generated/sourced pin image into,
-- so a pin's image keeps working even if the free provider it came from
-- goes down later.
insert into storage.buckets (id, name, public)
values ('pin-images', 'pin-images', true)
on conflict (id) do nothing;
