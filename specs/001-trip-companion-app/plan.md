# Implementation Plan: Trip Companion App

**Branch**: `001-trip-companion-app` | **Date**: 2026-11-10 (v2) | **Spec**: [spec.md](./spec.md)

## Summary
Static PWA on GitHub Pages + Supabase (Postgres, Google Auth, RLS, Realtime, Storage). Nothing trip-specific loads before Google sign-in; after sign-in the client claims membership (email allowlist), loads all tables, subscribes to Realtime, renders from a localStorage cache when offline and flushes an offline write outbox.
v2 adds: Sun/Mon option lock-in (`trip_settings`), expense split (`expenses`, Money tab), photo sharing (Storage bucket `trip-photos` + `messages.photo`), opt-in live location (`locations`), and RLS hardening from the advisors.

## Technical Context
- **Language**: HTML5, CSS, vanilla ES2020 JS (no build).
- **Dependencies**: `@supabase/supabase-js` v2.119 UMD, vendored at `vendor/supabase.js`.
- **Storage**: Supabase Postgres + Storage (project `jibhi-trip`, ref `zbiqeoybfzrmdfqqecqa`, ap-south-1). Client cache in `localStorage` (wiped on sign-out).
- **Hosting**: GitHub Pages via `.github/workflows/pages.yml` (copies app files only to `_site`; `tests/`, `specs/`, `data/` are not deployed).
- **Testing**: Playwright (pre-installed chromium) at 390×844 against `python3 -m http.server`, with a mock Supabase client (`tests/mock-supabase.js`) injected by request routing, because real Google sign-in can't be automated.
- **Target**: Mobile Chrome/Safari, 360–430 px; dark mode supported.
- **Constraints**: Public repo → only the publishable key in code; no emails, no passcodes committed. Supabase free tier (1 GB Storage, 500 MB DB).

## Constitution Check
| Principle | v2 check |
|---|---|
| I Phone-first | Money tab + Photos grid designed at 390 px; 5-tab bar keeps ≥ 52 px targets ✅ |
| II Place-first | Locations get 📍 Map / 🧭 Go; expenses aren't places (n/a) ✅ |
| III Live + offline | New tables on Realtime; option pick + expenses go through the outbox; photos/location are online-only by nature (documented) ✅ |
| IV Zero build | Plain JS additions in `app.js`; image resize via `<canvas>`; no new deps ✅ |
| V Secure by default | RLS on every new table, `to authenticated`, membership via `private.is_member`; private bucket with member-only object policies; location opt-in + no history ✅ |
| VI Plan vs ideas | Option lock-in changes what's *shown*, not the data; ideas flow unchanged ✅ |

## Project Structure
```
index.html            shell + sign-in gate only (tabs: Plan, Ideas, Chat, Money, Info) — no trip content
app.css               design tokens + components (light/dark)
app.js                state, Supabase sync, outbox, rendering, forms, money math, photos, location
config.js             Supabase URL + publishable key, trip id, people
sw.js, manifest.webmanifest, icons/   PWA
vendor/supabase.js    vendored client
data/seed.json        reference copy of the itinerary (not deployed)
supabase/schema.sql   tables, RLS, RPCs, storage policies, realtime (idempotent; no secrets)
supabase/seed.sql     itinerary seed (re-runnable)
tests/                mock-supabase.js + e2e.js (Playwright, not deployed)
specs/001-trip-companion-app/   spec, plan, research, data model, quickstart, tasks
docs/trip-context.md  full trip planning context & decisions
```

## Architecture
1. **Gate**: `index.html` shows only the sign-in card. `auth.getSession()`; if none → "Continue with Google" (`signInWithOAuth`, redirect back to Pages URL).
2. **Membership**: `rpc('claim_membership', {p_trip})` → name or null. Null → sign out + message. Offline with a prior session → open the cached copy.
3. **Load**: parallel selects of days, stops, suggestions, votes, comments, messages, members, trip_pages, trip_settings, expenses, locations (RLS: `private.is_member(trip_id)`).
4. **Realtime**: one channel, `postgres_changes` per table filtered by `trip_id`.
5. **Writes**: optimistic local apply → outbox (`localStorage`) → sequential flush (upsert / update / delete). Client UUIDs make retries idempotent. Row identity per table from one `KEYS` map (e.g. `trip_settings` = trip_id+key, `votes` = suggestion_id+user_id).
6. **Now/Next**: computed from stop `date`+`t` in IST against device time, every 60 s; days filtered by the chosen option.
7. **Option lock-in (US7)**: `chosenOpt()` reads `trip_settings[key=chosen_opt].value`; `visibleDays()` drops the other `opt` day; used by plan, nav, Now card, day pickers.
8. **Money (US8)**: pure functions `shares(amount, n)` (floor + distribute remainder to the first `amount mod n` people in `PEOPLE` order) → `balances()` → `settle()` (greedy largest debtor ↔ largest creditor; ≤ n−1 transfers).
9. **Photos (US9)**: file input → `createImageBitmap` → canvas (max side 1600) → JPEG 0.82 blob → `storage.from('trip-photos').upload('<trip>/<uuid>.jpg')` → message row `{photo: path, text: caption}`. Display via `createSignedUrls` (6 h), cached in memory/localStorage until 30 min before expiry. Delete = storage remove + message delete (own only).
10. **Location (US10)**: toggle persisted per device (`jt-loc-on`). While visible: `watchPosition` (low accuracy OK); upsert `locations` when ≥ 60 s since last write and (moved ≥ 100 m or ≥ 120 s). Stop/hidden → `clearWatch`; stop/sign-out → delete own row. Distances by haversine.

## Security
- RLS on every table, policies `to authenticated` only, using `private.is_member(trip_id)` (SECURITY DEFINER, fixed `search_path`, in a non-exposed schema so it isn't an RPC). `auth.uid()` wrapped as `(select auth.uid())` for initplan caching.
- `trip_allowlist` / `trip_secrets` (legacy): RLS with no policies — unreadable by clients (intentional advisor INFO).
- `claim_membership` SECURITY DEFINER callable by `authenticated` — intentional (it is the join path; it only inserts the caller's own membership if their JWT email is allowlisted).
- Votes/comments/messages/locations: insert/delete own rows only. Stops/suggestions/expenses/settings: any member may edit.
- Storage `trip-photos`: private, 5 MB limit, image MIME only; read/insert require membership of the first path segment (trip id); delete own objects only. `messages.photo` must start with `<trip_id>/`.
- Setup: Google provider ON; redirect URL `https://zuse1425.github.io/jibhi-trip/`. Leaked-password protection advisor is n/a (no password auth).

## Risks / follow-ups
- Last-write-wins on concurrent edits (acceptable).
- No push notifications — keep WhatsApp for urgent pings.
- Free-tier pause after 7 idle days; Storage 1 GB (≈ 3 000 photos at 300 KB).
- Location only updates while the app is open (no background on PWA).
- Realtime DELETE events may not pass `trip_id` filters; visibility-change reload covers it.
