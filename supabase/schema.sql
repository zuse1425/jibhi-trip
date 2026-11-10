-- Jibhi trip app · Supabase schema
-- Access model: each friend signs in with Google. Only emails in trip_allowlist become trip members.
-- Row Level Security only lets trip members read/write that trip's rows.
-- Requires: Authentication → Sign In / Providers → Google ON (client id + secret from Google Cloud),
--           Authentication → URL Configuration → redirect URL https://zuse1425.github.io/jibhi-trip/
-- Never commit email addresses: add them in the SQL editor (see the allowlist section below).

create extension if not exists pgcrypto;

-- ---------- membership ----------
create table if not exists public.trip_secrets (
  trip_id   text primary key,
  passcode  text not null
);
alter table public.trip_secrets enable row level security;   -- no policies: nobody can read it from the app

create table if not exists public.members (
  trip_id   text not null,
  user_id   uuid not null default auth.uid(),
  name      text not null,
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
alter table public.members enable row level security;

create or replace function public.is_member(p_trip text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.trip_id = p_trip and m.user_id = auth.uid());
$$;

-- passcode join (replaced by the allowlist below): keep it switched off
do $$ begin
  revoke execute on function public.join_trip(text, text, text) from anon, authenticated, public;
exception when undefined_function then null; end $$;
revoke execute on function public.is_member(text) from anon, public;
grant execute on function public.is_member(text) to authenticated;

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

create policy "members read" on public.members for select using (public.is_member(trip_id));
create policy "members rename self" on public.members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

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
create index if not exists comments_sug on public.comments(suggestion_id);
create index if not exists messages_trip on public.messages(trip_id, created_at);

-- ---------- RLS: members of the trip only ----------
do $$
declare t text;
begin
  foreach t in array array['days','stops','suggestions','votes','comments','messages','trip_pages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "member read" on public.%I', t);
    execute format('create policy "member read" on public.%I for select using (public.is_member(trip_id))', t);
  end loop;
end $$;

-- plan + suggestions: any member can add / edit
create policy "member write" on public.days        for all using (public.is_member(trip_id)) with check (public.is_member(trip_id));
create policy "member insert" on public.stops      for insert with check (public.is_member(trip_id));
create policy "member update" on public.stops      for update using (public.is_member(trip_id)) with check (public.is_member(trip_id));
create policy "member insert" on public.suggestions for insert with check (public.is_member(trip_id) and created_by = auth.uid());
create policy "member update" on public.suggestions for update using (public.is_member(trip_id)) with check (public.is_member(trip_id));
-- votes / comments / messages: your own rows only
create policy "own vote add"  on public.votes    for insert with check (public.is_member(trip_id) and user_id = auth.uid());
create policy "own vote del"  on public.votes    for delete using (user_id = auth.uid());
create policy "own comment"   on public.comments for insert with check (public.is_member(trip_id) and user_id = auth.uid());
create policy "own comment del" on public.comments for delete using (user_id = auth.uid());
create policy "own message"   on public.messages for insert with check (public.is_member(trip_id) and user_id = auth.uid());
create policy "own message del" on public.messages for delete using (user_id = auth.uid());

-- keep updated_at fresh
create or replace function public.touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); new.updated_by = auth.uid(); return new; end $$;
drop trigger if exists stops_touch on public.stops;
create trigger stops_touch before update on public.stops for each row execute function public.touch();
create or replace function public.touch_s() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists sugs_touch on public.suggestions;
create trigger sugs_touch before update on public.suggestions for each row execute function public.touch_s();

-- ---------- realtime ----------
do $$
declare t text;
begin
  foreach t in array array['stops','suggestions','votes','comments','messages','members'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
alter table public.votes replica identity full;      -- so vote deletes carry suggestion_id

-- ---------- the trip passcode ----------
-- Set it once in the SQL editor (never commit the real passcode to this public repo):
--   insert into public.trip_secrets(trip_id, passcode) values ('jibhi-nov-2026', '<your passcode>')
--   on conflict (trip_id) do update set passcode = excluded.passcode;
