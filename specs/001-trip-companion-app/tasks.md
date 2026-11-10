# Tasks: Trip Companion App

**Input**: spec.md, plan.md, research.md, data-model.md, quickstart.md
**Format**: `[ID] [P?] [Story] Description` — `[P]` = can run in parallel (different files, no dependency).
**Tests**: Playwright e2e at 390×844 with mocked Supabase (`tests/`), plus live advisor checks. No manual phone field test.
**Scope**: web app (PWA on GitHub Pages) only — no native/APK wrapper.

## Phase 1 — Setup ✅
- [x] T001 Create Supabase project `jibhi-trip` (ap-south-1, ref `zbiqeoybfzrmdfqqecqa`)
- [x] T002 Apply `supabase/schema.sql` (tables, RLS, RPCs, triggers, realtime)
- [x] T003 ~~Set trip passcode in `trip_secrets`~~ — superseded by `trip_allowlist` (not committed)
- [x] T004 Seed itinerary (`supabase/seed.sql`, 4 days / 42 stops)
- [x] T005 Vendor supabase-js v2.119 UMD; `config.js` with publishable key
- [x] T006 Spec Kit init (Claude integration), constitution
- [x] T007 ~~Enable Anonymous sign-ins~~ — replaced by Google sign-in + email allowlist (`trip_allowlist`, `claim_membership`)
- [x] T008 Create GitHub repo `zuse1425/jibhi-trip` (public), push, enable Pages → "GitHub Actions" (site live, HTTP 200)
- [x] T009 `.specify/feature.json` → `specs/001-trip-companion-app` (local, gitignored by Spec Kit; documented in CLAUDE.md); `.gitignore`

## Phase 2 — US1/US2/US6 Plan & Now (P1) ✅
- [x] T010 App shell (tabs), design tokens, dark mode
- [x] T011 Day timelines with stops, legs, "along the way" ideas, meal tags, alternatives
- [x] T012 📍 Map / 🧭 Go links + full-day route links
- [x] T013 Now card (countdown → now/next per day/option) + NOW/NEXT highlight, 60 s refresh
- [x] T014 Getting-there + Good-to-know from members-only `trip_pages`

## Phase 3 — Sync & offline ✅
- [x] T020 Google sign-in gate + `claim_membership` (allowlist); nothing rendered before sign-in
- [x] T021 Load all tables; Realtime subscriptions
- [x] T022 Optimistic writes + localStorage outbox + flush on reconnect
- [x] T023 PWA: manifest, icons, service worker
- [x] T025 Run Supabase security + performance advisors; fix findings (→ T050–T052)

## Phase 4 — US3/US4/US5 ✅
- [x] T030 Ideas board: create, vote, comment, decide→stop, drop, reopen, filters, badge
- [x] T031 Chat: send/receive, day separators, unread badge
- [x] T032 Edit mode: add/edit/soft-delete stops

## Phase 5 — Foundational for v2 (blocks US7–US10)
- [x] T050 `supabase/schema.sql`: schema `private` + `private.is_member`; drop `public.is_member`; make policy section idempotent (drop + recreate)
- [x] T051 `supabase/schema.sql`: all policies `to authenticated`, `(select auth.uid())`; split `days` write policy into insert/update/delete
- [x] T052 `supabase/schema.sql`: tables `trip_settings`, `expenses`, `locations`; `messages.photo`; triggers; realtime publication; bucket `trip-photos` + storage policies
- [x] T053 Apply T050–T052 as migrations; re-run security + performance advisors; document intentional findings in plan.md
- [x] T054 `app.js`: generic `KEYS` row identity for applyLocal/realtime; load + subscribe `trip_settings`, `expenses`, `locations`
- [x] T055 [P] `tests/mock-supabase.js`: in-memory supabase-js stand-in (auth, from/select/upsert/update/delete, rpc, channel, storage) seeded from `data/seed.json`
- [x] T056 [P] `.gitignore`

## Phase 6 — US7 Lock in Sun/Mon option (P1) 🎯
- [x] T060 [US7] `app.js`: `chosenOpt()`, `visibleDays()`; plan, day nav, Now card and day pickers use visible days
- [x] T061 [US7] `app.js` + `app.css`: "✅ Go with A / B" buttons; "Going with X · Change" banner; confirm before setting
- [x] T062 [US7] `tests/e2e.js`: pick B → A hidden in plan/nav/Now card (Sun 15 clock); Change → both back

## Phase 7 — US8 Split expenses (P2)
- [x] T070 [US8] `index.html` + `app.js`: Money tab (5th tab), list grouped by day, totals
- [x] T071 [US8] `app.js`: `shares()`, `balances()`, `settle()` pure functions
- [x] T072 [US8] `app.js`: add/edit/delete expense form (title, ₹, category, paid by, split chips) through the outbox
- [x] T073 [P] [US8] `app.css`: money cards, balance rows, settle-up list
- [x] T074 [US8] `tests/e2e.js`: ₹800 all four → +600/−200×3 and 3 transfers; ₹100 among 3 → 34/33/33; delete updates balances

## Phase 8 — US9 Photos (P3)
- [x] T080 [US9] `app.js`: 📷 button in chat → picker → downscale (≤ 1600 px JPEG) → caption modal → upload → message with `photo`
- [x] T081 [US9] `app.js`: signed-URL cache (batch `createSignedUrls`), photo bubbles in chat, Photos grid, tap → full size
- [x] T082 [US9] `app.js`: delete own photo (storage remove + message delete); offline guard
- [x] T083 [P] [US9] `app.css`: photo bubble, grid, chat header toggle
- [x] T084 [US9] `tests/e2e.js`: send a photo → in chat + grid; delete removes it

## Phase 9 — US10 Live location (P3)
- [x] T090 [US10] `app.js`: opt-in toggle (per device), `watchPosition`, throttled upsert, delete on stop/sign-out, pause when hidden
- [x] T091 [US10] `app.js` + `app.css`: "Where's everyone" list on Info (age, distance, stale, 📍 Map / 🧭 Go)
- [x] T092 [US10] `tests/e2e.js`: grant geolocation → own row shown; toggle off → removed

## Phase 10 — Polish
- [x] T100 `sw.js` cache bump; README/CLAUDE.md notes for new tables + tests
- [x] T101 Full e2e run at 390×844 (light + dark screenshots)
