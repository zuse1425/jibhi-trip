# Implementation Plan: Trip Companion App

**Branch**: `001-trip-companion-app` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

## Summary
Static PWA on GitHub Pages + Supabase (Postgres, anonymous Auth, RLS, Realtime). The client renders from a local cache instantly, then signs in anonymously, checks trip membership, loads all tables, subscribes to Realtime, and flushes an offline write outbox.

## Technical Context
- **Language**: HTML5, CSS, vanilla ES2020 JS (no build).
- **Dependencies**: `@supabase/supabase-js` v2.119 UMD, vendored at `vendor/supabase.js`.
- **Storage**: Supabase Postgres (project `jibhi-trip`, ref `zbiqeoybfzrmdfqqecqa`, ap-south-1). Client cache in `localStorage`.
- **Hosting**: GitHub Pages via `.github/workflows/pages.yml` (copies app files to `_site`).
- **Target**: Mobile Chrome/Safari, 360–430 px; dark mode supported.
- **Constraints**: Public repo → only the publishable key in code, passcode never committed.

## Constitution Check
- Phone-first ✅ · Place-first map links ✅ · Live + offline ✅ · Zero build ✅ · RLS + passcode ✅ · Plan vs ideas ✅

## Project Structure
```
index.html            app shell, static "Getting there" + "Good to know" sections
app.css               design tokens + components (light/dark)
app.js                state, Supabase sync, outbox, rendering, forms
config.js             Supabase URL + publishable key, trip id, people
sw.js, manifest.webmanifest, icons/   PWA
vendor/supabase.js    vendored client
data/seed.json        offline-first fallback itinerary (same as DB seed)
supabase/schema.sql   tables, RLS, RPCs, realtime (idempotent; passcode NOT included)
supabase/seed.sql     itinerary seed (re-runnable)
specs/001-trip-companion-app/   spec, plan, data model, tasks
docs/trip-context.md  full trip planning context & decisions
```

## Architecture
1. **Boot**: render from `localStorage` cache, else `data/seed.json`.
2. **Auth**: `auth.getSession()` → `signInAnonymously()` if none (session persists on the phone).
3. **Membership**: select own row in `members`; if missing → Join dialog → `rpc('join_trip', {p_trip, p_code, p_name})`.
4. **Load**: parallel selects of days, stops, suggestions, votes, comments, messages, members (RLS: `is_member(trip_id)`).
5. **Realtime**: one channel, `postgres_changes` per table filtered by `trip_id`.
6. **Writes**: optimistic local apply → append to outbox (`localStorage`) → sequential flush (upsert / update / delete). Client-generated UUIDs make retries idempotent.
7. **Now/Next**: computed from stop `date`+`t` in IST against device time, every 60 s.

## Security
- RLS on every table; `trip_secrets` has RLS with no policies (unreadable by clients).
- `join_trip` and `is_member` are `SECURITY DEFINER` with fixed `search_path`.
- Votes/comments/messages: insert/delete only own rows. Stops/suggestions: any member may edit.
- **Setup requirement**: Supabase Dashboard → Authentication → Sign In / Providers → enable **Anonymous sign-ins**.

## Risks / follow-ups
- Last-write-wins on concurrent stop edits (acceptable).
- No push notifications (PWA limitation without extra infra) — keep WhatsApp for urgent pings.
- Free-tier pause after 7 idle days.
