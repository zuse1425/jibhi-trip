# Tasks: Trip Companion App

**Input**: spec.md, plan.md, data-model.md

## Phase 1 — Setup ✅
- [x] T001 Create Supabase project `jibhi-trip` (ap-south-1, ref `zbiqeoybfzrmdfqqecqa`)
- [x] T002 Apply `supabase/schema.sql` (tables, RLS, RPCs, triggers, realtime)
- [x] T003 Set trip passcode in `trip_secrets` (not committed)
- [x] T004 Seed itinerary (`supabase/seed.sql`, 4 days / 42 stops)
- [x] T005 Vendor supabase-js v2.119 UMD; `config.js` with publishable key
- [x] T006 Spec Kit init (Claude integration), constitution
- [ ] T007 **Enable Anonymous sign-ins** in Supabase Auth (dashboard) — *manual*
- [ ] T008 Create GitHub repo `zuse1425/jibhi-trip` (public), push, enable Pages → "GitHub Actions"

## Phase 2 — US1/US2 Plan & Now (P1) ✅
- [x] T010 App shell (tabs: Plan / Ideas / Chat / Info), design tokens, dark mode
- [x] T011 Day timelines with stops, legs, "along the way" ideas, meal tags, alternatives
- [x] T012 📍 Map / 🧭 Go links + full-day route links
- [x] T013 Now card (countdown → now/next per day/option) + NOW/NEXT highlight, 60 s refresh
- [x] T014 Getting-there section (per person) + Good-to-know (tolls, cafés, fun, Bollywood, packing)

## Phase 3 — Sync & offline ✅ (needs field test)
- [x] T020 Anonymous auth + Join dialog + `join_trip`
- [x] T021 Load all tables; Realtime subscriptions
- [x] T022 Optimistic writes + localStorage outbox + flush on reconnect
- [x] T023 PWA: manifest, icons, service worker
- [ ] T024 Field test on 2 phones: join, edit, idea→decide, chat, airplane-mode queue
- [ ] T025 Run Supabase security + performance advisors; fix findings

## Phase 4 — US3/US4/US5 ✅ (needs field test)
- [x] T030 Ideas board: create, vote, comment, decide→stop, drop, reopen, filters, badge
- [x] T031 Chat: send/receive, day separators, unread badge
- [x] T032 Edit mode: add/edit/soft-delete stops

## Phase 5 — Nice to have
- [ ] T040 Mark Sun/Mon option as chosen (hide the other) — add `trip_settings` table
- [ ] T041 Expenses split (who paid what)
- [ ] T042 Photo sharing (Supabase Storage)
- [ ] T043 Live location share (opt-in)
- [ ] T044 Wrap as Android APK via PWABuilder (TWA) if wanted
