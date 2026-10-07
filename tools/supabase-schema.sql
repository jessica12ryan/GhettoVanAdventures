-- Ghetto Van Adventures — sightings map schema (Supabase / Postgres).
--
-- Setup (one time, ~5 minutes):
--   1. Create a free project at https://supabase.com
--   2. Open the SQL Editor, paste this whole file, Run.
--   3. Copy Project URL + anon public key into assets/js/site-config.js
--
-- Security model (Row Level Security — the anon key is public by design):
--   - Anyone can READ only approved sightings.
--   - Anyone can INSERT, but only with approved = false (visitors can
--     never publish to the live map themselves).
--   - Only you, via the Supabase dashboard (service role, bypasses RLS),
--     can approve (set approved = true), edit, or delete.
-- Approving = Table Editor -> sightings -> filter approved = false ->
-- flip to true. Live on the site immediately, no deploy needed.

create table if not exists public.sightings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  place text not null,
  date_seen date,
  note text not null default '',
  reporter text not null default 'Anonymous',
  approved boolean not null default false
);

alter table public.sightings enable row level security;

drop policy if exists "Public read approved" on public.sightings;
create policy "Public read approved"
  on public.sightings for select
  using (approved = true);

drop policy if exists "Public submit pending" on public.sightings;
create policy "Public submit pending"
  on public.sightings for insert
  with check (approved = false);

-- Seed: home base (public info, also on the About page). Runs only once.
insert into public.sightings (lat, lng, place, date_seen, note, reporter, approved)
select 44.0426, -77.7379, 'Brighton, Ontario',
  null,
  'Home base — where the van adventures begin.',
  'GVA', true
where not exists (select 1 from public.sightings where reporter = 'GVA' and place = 'Brighton, Ontario');
