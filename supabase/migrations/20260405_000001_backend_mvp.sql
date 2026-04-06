-- PaceUp Backend MVP (Supabase)
-- Created: 2026-04-05

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_m numeric(10,2) not null default 0,
  elapsed_seconds integer not null default 0,
  average_pace_min_km numeric(6,3),
  music_file_name text,
  music_mode text check (music_mode in ('follow_music','target_pace')),
  source_device_id text,
  sync_status text not null default 'synced' check (sync_status in ('pending','synced','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_updated on public.sessions(user_id, updated_at desc);

create table if not exists public.session_points (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m numeric(8,2),
  speed_ms numeric(8,3),
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(session_id, seq)
);

create index if not exists idx_session_points_session_seq on public.session_points(session_id, seq);

create table if not exists public.interval_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  source_device_id text,
  sync_status text not null default 'synced' check (sync_status in ('pending','synced','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interval_templates_user_updated on public.interval_templates(user_id, updated_at desc);

create table if not exists public.interval_blocks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.interval_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null,
  name text not null,
  mode text not null check (mode in ('tempo','distancia')),
  value integer not null check (value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_id, seq)
);

create index if not exists idx_interval_blocks_template_seq on public.interval_blocks(template_id, seq);

create table if not exists public.calibration_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stride_m numeric(6,4) not null,
  confidence integer check (confidence between 0 and 100),
  source text default 'app',
  source_device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_calibration_user_created on public.calibration_history(user_id, created_at desc);

create table if not exists public.app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coach_enabled boolean not null default false,
  intro_disabled boolean not null default false,
  preferred_music_mode text check (preferred_music_mode in ('follow_music','target_pace')),
  preferred_rate_control text check (preferred_rate_control in ('manual','auto')),
  preferred_target_pace_min_km numeric(6,3),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_sessions_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

create trigger trg_interval_templates_updated_at
before update on public.interval_templates
for each row execute function public.set_updated_at();

create trigger trg_interval_blocks_updated_at
before update on public.interval_blocks
for each row execute function public.set_updated_at();

create trigger trg_calibration_updated_at
before update on public.calibration_history
for each row execute function public.set_updated_at();

create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_points enable row level security;
alter table public.interval_templates enable row level security;
alter table public.interval_blocks enable row level security;
alter table public.calibration_history enable row level security;
alter table public.app_settings enable row level security;

create policy profiles_owner_all on public.profiles
for all using (id = auth.uid()) with check (id = auth.uid());

create policy sessions_owner_all on public.sessions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy session_points_owner_all on public.session_points
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy interval_templates_owner_all on public.interval_templates
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy interval_blocks_owner_all on public.interval_blocks
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy calibration_owner_all on public.calibration_history
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy app_settings_owner_all on public.app_settings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
