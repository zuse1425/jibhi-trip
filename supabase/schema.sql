-- Jibhi trip app · Supabase schema (idempotent: safe to re-run in the SQL editor)
-- Access model: each friend signs in with Google. Only emails in trip_allowlist become trip members.
-- Row Level Security only lets trip members read/write that trip's rows (private.is_member).
-- Requires: Authentication → Sign In / Providers → Google ON (client id + secret from Google Cloud),
--           Authentication → URL Configuration → redirect URL https://zuse1425.github.io/jibhi-trip/
-- Never commit email addresses or secrets: add them in the SQL editor (see the allowlist section below).

create extension if not exists pgcrypto;

-- ---------- membership ----------
-- legacy (passcode join, switched off). RLS with no policies: unreadable from the app.
create table if not exists public.trip_secrets (
  trip_id   text primary key,
  passcode  text not null
);
alter table public.trip_secrets enable row level security;

create table if not exists public.members (
  trip_id   text not null,
  user_id   uuid not null default auth.uid(),
  name      text not null,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
alter table public.members enable row level security;

-- membership check used by every policy. Lives in a schema the API doesn't expose, so it isn't an RPC.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_member(p_trip text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.trip_id = p_trip and m.user_id = (select auth.uid()));
$$;
revoke execute on function private.is_member(text) from public, anon;
grant execute on function private.is_member(text) to authenticated;

-- passcode join (replaced by the allowlist below): keep it switched off
do $$ begin
  revoke execute on function public.join_trip(text, text, text) from anon, authenticated, public;
exception when undefined_function then null; end $$;

-- ---------- sign-in allowlist (Google emails) ----------
create table if not exists public.trip_allowlist (
  trip_id text not null,
  email   text not null check (email = lower(email)),   -- Google account email, lowercase
  name    text not null,
  primary key (trip_id, email)
);
alter table public.trip_allowlist enable row level security;   -- no policies: unreadable from the app

-- after sign-in the app calls this: joins the trip if your email is on the list; returns your name or null
create or replace function public.claim_membership(p_trip text)
returns text language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select a.name into v_name from public.trip_allowlist a
   where a.trip_id = p_trip and a.email = lower(auth.jwt() ->> 'email');
  if v_name is null then return null; end if;
  insert into public.members(trip_id, user_id, name) values (p_trip, auth.uid(), v_name)
  on conflict (trip_id, user_id) do nothing;
  return (select name from public.members where trip_id = p_trip and user_id = auth.uid());
end $$;
revoke execute on function public.claim_membership(text) from anon, public;
grant execute on function public.claim_membership(text) to authenticated;

-- add a person (SQL editor, not committed):
--   insert into public.trip_allowlist(trip_id, email, name) values ('jibhi-nov-2026', 'someone@gmail.com', 'Name')
--   on conflict (trip_id, email) do update set name = excluded.name;
drop function if exists public.add_trip_user(text, text, text, text, text);

-- ---------- plan ----------
create table if not exists public.days (
  trip_id text not null,
  id      text not null,
  sort    int  not null default 0,
  kicker  text, title text, stay text, route text, opt text,
  primary key (trip_id, id)
);

create table if not exists public.stops (
  id         uuid primary key default gen_random_uuid(),
  trip_id    text not null,
  day        text not null,
  date       date not null,
  t          text not null,                 -- 'HH:MM' 24h, IST
  kind       text not null default 'do',    -- meet | meal | drive | do | stay | hike
  name       text not null,
  area       text, q text, pid text, map_url text, note text, tag text, label text,
  alts       jsonb not null default '[]',   -- [{label,q,pid}]
  leg        jsonb,                         -- {mode,text,url}  how we get here
  idea       jsonb,                         -- {title,text,links:[{label,url}]}  optional ideas before this stop
  deleted    boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists stops_trip on public.stops(trip_id, date, t);

-- ---------- static page content (members only; not in the public HTML) ----------
-- ids: title, lead, reach, know, footer. Content is loaded from the SQL editor, never committed.
create table if not exists public.trip_pages (
  trip_id text not null,
  id      text not null,
  html    text not null,
  primary key (trip_id, id)
);

-- ---------- shared settings (key/value), e.g. chosen_opt = "A" | "B" | null ----------
create table if not exists public.trip_settings (
  trip_id    text not null,
  key        text not null check (key in ('chosen_opt')),
  value      jsonb,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, key)
);

-- ---------- ideas / chat ----------
create table if not exists public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  trip_id     text not null,
  day         text,
  title       text not null,
  area        text, map_url text, note text,
  status      text not null default 'open', -- open | decided | dropped
  stop_id     uuid,
  created_by  uuid not null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.votes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id       uuid not null default auth.uid(),
  trip_id       text not null,
  primary key (suggestion_id, user_id)
);

create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  trip_id       text not null,
  user_id       uuid not null default auth.uid(),
  text          text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  trip_id    text not null,
  user_id    uuid not null default auth.uid(),
  text       text not null,
  created_at timestamptz not null default now()
);
-- photo = Storage path in bucket trip-photos, always under the trip's folder
alter table public.messages add column if not exists photo text;
do $$ begin
  alter table public.messages add constraint messages_photo_path check (photo is null or photo like trip_id || '/%');
exception when duplicate_object then null; end $$;
create index if not exists comments_sug on public.comments(suggestion_id);
create index if not exists messages_trip on public.messages(trip_id, created_at);

-- ---------- money ----------
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  trip_id    text not null,
  title      text not null check (char_length(title) between 1 and 120),
  amount     int  not null check (amount > 0 and amount <= 1000000),   -- whole rupees
  kind       text not null default 'other',  -- food | stay | cab | fuel | toll | fun | other
  paid_by    text not null,                  -- a name from config.js PEOPLE
  split      text[] not null check (cardinality(split) > 0),
  deleted    boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_trip on public.expenses(trip_id, created_at);

-- ---------- live location (opt-in, latest point only, no history) ----------
create table if not exists public.locations (
  trip_id    text not null,
  user_id    uuid not null default auth.uid(),
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  acc        real,
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- ---------- RLS: members of the trip only, signed-in role only ----------
do $$
declare t text; p record;
begin
  foreach t in array array['members','days','stops','trip_pages','trip_settings','suggestions','votes','comments','messages','expenses','locations'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy "member read" on public.%I for select to authenticated using (private.is_member(trip_id))', t);
  end loop;
end $$;

create policy "rename self" on public.members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- plan, ideas, settings, money: any member can add / edit
create policy "member insert" on public.days for insert to authenticated with check (private.is_member(trip_id));
create policy "member update" on public.days for update to authenticated using (private.is_member(trip_id)) with check (private.is_member(trip_id));
create policy "member delete" on public.days for delete to authenticated using (private.is_member(trip_id));
create policy "member insert" on public.stops for insert to authenticated with check (private.is_member(trip_id));
create policy "member update" on public.stops for update to authenticated using (private.is_member(trip_id)) with check (private.is_member(trip_id));
create policy "member insert" on public.trip_settings for insert to authenticated with check (private.is_member(trip_id));
create policy "member update" on public.trip_settings for update to authenticated using (private.is_member(trip_id)) with check (private.is_member(trip_id));
create policy "member insert" on public.suggestions for insert to authenticated with check (private.is_member(trip_id) and created_by = (select auth.uid()));
create policy "member update" on public.suggestions for update to authenticated using (private.is_member(trip_id)) with check (private.is_member(trip_id));
create policy "member insert" on public.expenses for insert to authenticated with check (private.is_member(trip_id) and created_by = (select auth.uid()));
create policy "member update" on public.expenses for update to authenticated using (private.is_member(trip_id)) with check (private.is_member(trip_id));
-- votes / comments / messages / locations: your own rows only
create policy "own insert" on public.votes    for insert to authenticated with check (private.is_member(trip_id) and user_id = (select auth.uid()));
create policy "own delete" on public.votes    for delete to authenticated using (user_id = (select auth.uid()));
create policy "own insert" on public.comments for insert to authenticated with check (private.is_member(trip_id) and user_id = (select auth.uid()));
create policy "own delete" on public.comments for delete to authenticated using (user_id = (select auth.uid()));
create policy "own insert" on public.messages for insert to authenticated with check (private.is_member(trip_id) and user_id = (select auth.uid()));
create policy "own delete" on public.messages for delete to authenticated using (user_id = (select auth.uid()));
create policy "own insert" on public.locations for insert to authenticated with check (private.is_member(trip_id) and user_id = (select auth.uid()));
create policy "own update" on public.locations for update to authenticated using (user_id = (select auth.uid())) with check (private.is_member(trip_id) and user_id = (select auth.uid()));
create policy "own delete" on public.locations for delete to authenticated using (user_id = (select auth.uid()));

-- the old public helper is no longer referenced by any policy
drop function if exists public.is_member(text);

-- keep updated_at (and updated_by) fresh
create or replace function public.touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); new.updated_by = auth.uid(); return new; end $$;
create or replace function public.touch_s() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists stops_touch on public.stops;
create trigger stops_touch before update on public.stops for each row execute function public.touch();
drop trigger if exists settings_touch on public.trip_settings;
create trigger settings_touch before insert or update on public.trip_settings for each row execute function public.touch();
drop trigger if exists sugs_touch on public.suggestions;
create trigger sugs_touch before update on public.suggestions for each row execute function public.touch_s();
drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_s();
drop trigger if exists locations_touch on public.locations;
create trigger locations_touch before insert or update on public.locations for each row execute function public.touch_s();

-- ---------- photos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trip photos read" on storage.objects;
drop policy if exists "trip photos add" on storage.objects;
drop policy if exists "trip photos delete own" on storage.objects;
create policy "trip photos read" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and private.is_member((storage.foldername(name))[1]));
create policy "trip photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and private.is_member((storage.foldername(name))[1]));
create policy "trip photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and owner_id = (select auth.uid())::text);

-- ---------- realtime ----------
do $$
declare t text;
begin
  foreach t in array array['stops','suggestions','votes','comments','messages','members','days','trip_settings','expenses','locations'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
alter table public.votes replica identity full;      -- so vote deletes carry suggestion_id
alter table public.locations replica identity full;  -- so location deletes carry trip_id/user_id
