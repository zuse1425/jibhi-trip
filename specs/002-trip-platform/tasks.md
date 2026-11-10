# Tasks: Trip Platform

**Input**: `specs/002-trip-platform/` (spec.md, plan.md, research.md, data-model.md, contracts/ai-chat.md), `docs/wireframes.html`, `docs/design-system.md`

**How to work**: do tasks in order unless marked **[P]** (can run alongside its neighbours). Tick each box when done. After each phase: `npm run typecheck && npm test && npm run build` in `web/`, check the phase's screens at 390×844 with Playwright against the live Supabase project, then commit. Never commit emails, phone numbers, UPI IDs or keys. After any schema change, run the Supabase security and performance advisors.

**Tests**: unit tests only for pure logic in `web/src/lib/` (listed below). One Playwright flow per user story at the end of its phase.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Create `web/` with Vite + React 19 + TypeScript (`npm create vite@latest web -- --template react-ts`). Add scripts `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`).
- [ ] T002 Add Tailwind v4 and shadcn/ui (`npx shadcn@latest init`), `lucide-react`. Add components: button, card, input, textarea, label, drawer, alert-dialog, toggle-group, avatar, badge, switch, sonner, skeleton, scroll-area.
- [ ] T003 [P] Put the design tokens from `docs/design-system.md` §1–3 into `web/src/index.css` as CSS variables (light and dark via `prefers-color-scheme`) and map them to Tailwind theme colours (`page`, `surface`, `ink`, `muted`, `line`, `sun`, `sun-soft`, `sky`, `sky-soft`, `leaf`, `leaf-soft`, `rose`). Self-host Plus Jakarta Sans (`@fontsource-variable/plus-jakarta-sans`). Add a `primary` Button variant: `bg-sun text-[#14213D]`.
- [ ] T004 **Needs Naman**: in Supabase → Authentication → URL Configuration, add redirect URL `https://zuse1425.github.io/jibhi-trip/**`. In Google Cloud the origin is already allowed.
- [ ] T005 Update `.github/workflows/pages.yml`: set up Node 22, `npm ci && npm run build` in `web/` with `VITE_BASE=/jibhi-trip/next/`, copy `web/dist` to `_site/next/` beside the existing app files. `vite.config.ts` reads `base` from `VITE_BASE` (default `/`).
- [ ] T006 [P] Add `web/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_TRIP_FALLBACK`); commit `web/.env.production` with the public URL and publishable key only (same values as `config.js`).

## Phase 2: Foundational (blocks every story)

- [ ] T010 Write migration `supabase/migrations/2026-11-10_trip_platform.sql` from `data-model.md`: new tables, added columns, indexes, functions (`is_owner`, `claim_memberships`, `create_trip`, `invite_member`, `remove_member`, `save_expense`, `trip_balances`), RLS policies exactly per the table, Realtime publication and replica identities. Idempotent (`if not exists`, `create or replace`, `drop policy if exists`). Revoke execute from `anon, public`; grant to `authenticated`.
- [ ] T011 Apply T010 to project `zbiqeoybfzrmdfqqecqa`; backfill `trips` row for `jibhi-nov-2026` and set the existing member's role to `owner`; merge the same SQL into `supabase/schema.sql`; run both advisors and fix findings.
- [ ] T012 `web/src/lib/supabase.ts` (client, `persistSession: true`), `web/src/data/auth.ts`: `useSession()`, `signInWithGoogle()` (redirect back to the current base URL), `signOut()` (Supabase sign-out, clear query cache + localStorage keys starting `tp-`, reload).
- [ ] T013 `web/src/lib/query.ts`: QueryClient (`staleTime` 30 s, `gcTime` 7 days, `networkMode: 'offlineFirst'`), `persistQueryClient` to localStorage key `tp-cache` only when a session exists, `setMutationDefaults` registry so paused mutations survive reload.
- [ ] T014 `web/src/router.tsx` with the routes in plan.md. `RequireAuth` wrapper: no session → `/sign-in`, and no data hooks mount. `TripLayout`: loads trip + members, mounts `useTripRealtime(tripId)`, renders `<Outlet/>` and `TabBar`.
- [ ] T015 [P] `web/src/components/TabBar.tsx` (five `NavLink`s; active = sky label + 20×3 sun marker; 64 px high; safe-area padding), `ScreenHeader.tsx` (title, optional subtitle, right slot), `SyncChip.tsx` (Offline / Syncing n / Live).
- [ ] T016 `web/src/data/realtime.ts`: `useTripRealtime(tripId)` subscribes to `postgres_changes` for stops, days, journey_legs, locations, messages, suggestions, votes, expenses, expense_shares, settlements, members (filter `trip_id=eq.{id}`) and patches the matching query cache by primary key; on `SUBSCRIBED` after a drop and on `visibilitychange`, invalidate `[*, tripId]`.
- [ ] T017 [P] `web/src/lib/time.ts` + `time.test.ts`: `nowIST()`, `toMinutes('HH:MM')`, `fmtTime`, `fmtDay`, `daysUntil`.
- [ ] T018 [P] `web/src/lib/maps.ts`: `mapsSearchUrl`, `mapsDirectionsUrl` (prefer `lat,lng`, then `q` + `pid`, then `name + area`), ported from `app.js`.
- [ ] T019 PWA: `vite-plugin-pwa` with manifest (name "Trips", theme `#FFC93C`, existing icons), precache shell only, `registerType: 'autoUpdate'`.

**Checkpoint**: signed-out visit shows nothing but sign-in; build deploys to `/next/`.

## Phase 3: US1 — Sign in and open my trip (P1)

- [ ] T020 [US1] `screens/SignIn.tsx` per wireframe gate: icon, "Trips", one line, "Continue with Google" (white button with the Google mark). Shows a plain message when a signed-in email is on no trip.
- [ ] T021 [US1] `data/trips.ts`: `useTrips()` calls `rpc('claim_memberships')` once per session, then selects `trips` joined with a member count. `screens/Trips.tsx` per wireframe 1 (cover, name, dates, people, status chip: "Starts in n days" / "Day n of m" / "Ended"); redirect to `/t/:id/today` when exactly one trip.
- [ ] T022 [US1] `data/members.ts`: `useMembers(tripId)`, `useMe(tripId)`; `components/Avatar.tsx` (initial on a tint derived from the user id).
- [ ] T023 [US1] `screens/TripSettings.tsx` (reached from the avatar in headers): my display name, my UPI ID, Sign out. Owner section is added in T091.
- [ ] T024 [US1] Playwright: signed-out page has no trip text and makes no REST calls; an allow-listed test user lands on Today. Create the test user by SQL and delete it afterwards.

## Phase 4: US3 — Plan list (P1)

- [ ] T030 [US3] `data/days.ts`, `data/stops.ts`: queries (`deleted = false`, ordered by `date, t`), mutations `saveStop` (upsert by client UUID) and `deleteStop` (sets `deleted`), both optimistic and registered in the mutation defaults.
- [ ] T031 [US3] `components/DayChips.tsx` (scrollable chips from `days`; optional "All days"), `components/StopRow.tsx` (time, title, one muted line = area or note, "Go" link).
- [ ] T032 [US3] `screens/Plan.tsx` per wireframe 4: header with List/Map toggle (`?view`), chips (`?day`, default today's day or the first), rows, "+ Add stop", "Find with AI" (links to Explore). Empty state for a day with no stops.
- [ ] T033 [US3] `components/StopSheet.tsx` (Drawer): type (ToggleGroup of the six kinds with lucide icons), title, time, day, place (`PlacePicker`), note; Save; Delete behind an AlertDialog. Used for add and edit.
- [ ] T034 [US3] `lib/geocode.ts` (Photon: `https://photon.komoot.io/api/?q=…&limit=5`, bias to the trip's first stop when known) and `components/PlacePicker.tsx` (debounced search list; choosing fills name, area, lat, lng; free text allowed).
- [ ] T035 [US3] Playwright: add, edit and delete a stop; a second browser context sees the change without reload; offline edit applies after reconnect.

## Phase 5: US2 — Today (P1)

- [ ] T040 [US2] `lib/nowNext.ts` + tests: `groupNowNext(stops, now)`, `myNext(legs, stops, me, now)`, `personStatus(member, legs, location, stops, now)` per plan.md. Cover: before trip, mid-leg, between stops, after last stop, past midnight.
- [ ] T041 [US2] `data/journeys.ts`: `useLegs(tripId)`, `saveLeg`, `deleteLeg` (optimistic). `components/JourneySheet.tsx`: list of a person's legs with add/edit (mode, title, from, to, depart, arrive, note); editable by that person or the owner.
- [ ] T042 [US2] `screens/Today.tsx` per wireframe 3: header (trip name links to Trips, date, clock); "Your next step" card (sun-soft) with Directions + Full plan; "Then, everyone" row; "Where everyone is" list (`PersonRow`: avatar, name, status line, time) with a Map link; "Share my location" switch (wired in T072). Re-evaluate every 60 s. Countdown state before the trip; "Trip finished" state after.
- [ ] T043 [US2] Fallback: if the trip has a `trip_pages.reach` row and I have no legs, show it under "Your next step" as "Getting there" (collapsed), so the Jibhi content is available before legs exist.
- [ ] T044 [US2] Seed journey legs for the Jibhi trip from `trip_pages.reach` for members who have signed in (SQL, not committed). Document the query shape in `supabase/seed.sql` with placeholder ids.
- [ ] T045 [US2] Playwright: with a mocked clock, Today shows the right leg, then the right stop.

## Phase 6: US4 — Money (P1)

- [ ] T050 [US4] `lib/money.ts` + tests: `splitEqual(totalPaise, userIds, payerId)`, `balances(expenses, shares, settlements, memberIds)`, `settleUp(balances)`, `formatINR(paise)`, `upiLink(...)`. Tests: sums are zero, remainder paise rule, at most n−1 payments, three hand-checked scenarios including the wireframe numbers (8,000 + 6,000 + 1,200 among 4).
- [ ] T051 [US4] `data/expenses.ts`: queries for expenses (not deleted), shares, settlements; `saveExpense` → `rpc('save_expense')`; `deleteExpense`; `addSettlement`; optimistic.
- [ ] T052 [P] [US6] One-off script `web/scripts/geocode-stops.mjs` (not shipped): for stops without `lat`, query Photon with `q` or `name + area`, print proposed updates as SQL for review. Apply after a human check.
- [ ] T053 [US4] `components/ExpenseSheet.tsx`: big amount field (numeric keypad), title, paid by (member chips, default me), split: "Equally" with member chips to include/exclude, or "Custom" with an amount per person and a live "₹x left" check; date defaults to today; Save disabled until valid.
- [ ] T054 [US4] `screens/Money.tsx` per wireframe 8: summary card (leaf-soft "You get back ₹x" / rose-soft "You owe ₹x" / neutral "All settled"), Balances with "Settle up", Expenses list (title, "X paid · split n ways", amount), "+ Add expense". Tapping an expense opens the sheet (read-only unless creator or payer).
- [ ] T055 [US4] `components/SettleSheet.tsx`: list from `settleUp`; each row "A pays B ₹x" with "Pay by UPI" (if B has a UPI ID) and "Mark paid" (inserts a settlement; only A or B).
- [ ] T056 [US4] Playwright: three expenses from two accounts; balances match; mark one payment; totals still zero.

## Phase 7: US5 — Chat and ideas (P2)

- [ ] T060 [P] [US7] **Spike (1 hour max)**: try `@ag-ui/client` against a stub SSE endpoint in the browser. If it adds more than it saves, write `web/src/ai/client.ts` as a plain `fetch` + `ReadableStream` SSE reader emitting the events in `contracts/ai-chat.md`. Record the outcome in research.md R7.
- [ ] T061 [US5] `data/messages.ts`, `data/ideas.ts`: messages ordered by time (last 200), `sendMessage`, ideas = `suggestions` + `votes`, `postIdea` (insert suggestion + message of kind `idea`), `toggleVote`, `decideIdea` (create stop, set suggestion `status = 'decided'`, `stop_id`, insert a `system` message).
- [ ] T062 [US5] `screens/Chat.tsx` per wireframe 7: day separators, others' bubbles left with name, mine right in ink, `IdeaCard` (sky-soft: "Idea from X", title, line, "n of m in", buttons I'm in / Add to plan / Map), system lines dashed and centred, composer with a "+" to post an idea. "Ideas n" filter button. Auto-scroll to the newest; unread badge on the Chat tab (last-seen timestamp in localStorage `tp-seen-{trip}`).
- [ ] T063 [US5] `components/AddToPlanSheet.tsx`: pick day and time (prefilled from the idea or place), confirm → `saveStop`. Reused by Explore.
- [ ] T064 [US5] Playwright: post idea, vote from a second account, add to plan, system line appears, stop exists.

## Phase 8: US6 — Map and live location (P2)

- [ ] T070 [US6] `screens/PlanMap.tsx` (lazy chunk): MapLibre with OpenFreeMap "liberty" style, numbered HTML pins for the selected day in time order (or all days, numbered per day), dashed line through them, fit bounds with padding, "Me" button, selected pin in sun. Bottom card for the selected stop with Directions and Details. "Not on map" list for stops without coordinates.
- [ ] T071 [US6] `data/locations.ts`: `useLocations(tripId)`; `useShareLocation(tripId)`: when enabled and the tab is visible, `watchPosition` and upsert at most every 30 s; delete my row when turned off; preference in localStorage `tp-share-{trip}`; handle denied permission with a toast and turn the switch off.
- [ ] T072 [US6] Wire the Today switch to T071; show people on the map as labelled markers, dimmed with "n min ago" when older than 10 min; feed `location` into `personStatus`.
- [ ] T073 [US6] Playwright with mocked geolocation in two contexts: each sees the other's marker; turning sharing off removes it.

## Phase 9: US7 — Explore with AI (P2)

- [ ] T080 [US7] `supabase/functions/ai-chat/index.ts` per `contracts/ai-chat.md` (CORS for the Pages origin and localhost, JWT check, membership check with the caller's token, OpenRouter streaming with the web plugin and the `show_places` tool, SSE translation, 429/503 handling, no content logging). Deploy with JWT verification on.
- [ ] T081 **Needs Naman**: set `OPENROUTER_API_KEY` (and optionally `AI_MODEL`) in Supabase → Edge Functions → Secrets.
- [ ] T082 [US7] `web/src/ai/context.ts` (compact trip summary, no people's names), `ai/client.ts` (from T060), `screens/Explore.tsx` per wireframe 6: in-memory messages, streaming text, `PlaceCard`s from `show_places` (Add to plan → `AddToPlanSheet`; Suggest → `postIdea`; Map → Google Maps link), two suggestion chips built from the plan ("Things to do {next day}", "Lunch on the way"), Clear, friendly error state.
- [ ] T084 [US7] Playwright against a stubbed function response: cards render; Add to plan creates a stop; Suggest posts an idea.

## Phase 10: US8 — Create a trip (P3)

- [ ] T090 [US8] `screens/NewTrip.tsx` per wireframe 2: name, dates, people (email chips), description. "Start with a blank plan" → `rpc('create_trip')` → go to the trip's Plan.
- [ ] T091 [US8] Owner section in `TripSettings.tsx`: rename, dates, people list with invite (`invite_member`) and remove (`remove_member`, AlertDialog).
- [ ] T092 [US8] "Draft the plan with AI": call `ai-chat` with a drafting instruction and a `propose_plan` tool (days → stops); show a review list with a checkbox per stop; "Add selected" writes stops. Extend the contract file with `propose_plan`.
- [ ] T093 [US8] Playwright: create a trip with one invited test email; that account sees it.

## Phase 11: Polish and switch-over

- [ ] T100 Empty, loading (Skeleton) and error states on every screen; all buttons ≥ 44 px; check 360 px width and dark mode.
- [ ] T101 Accessibility pass: labels on inputs, `aria-label` on icon buttons, focus visible, contrast per the design system.
- [ ] T102 Bundle check: map and AI code are lazy chunks; first load under 250 kB gzipped.
- [ ] T103 Update `CLAUDE.md`, `README.md`, `supabase/schema.sql`, and tick `specs/001` leftovers that this feature closes (T041, T043).
- [ ] T104 **Switch-over (needs Naman's OK)**: build with `VITE_BASE=/jibhi-trip/`, publish `web/dist` at the site root, remove the old `index.html`, `app.js`, `app.css`, `sw.js`, `config.js`, `vendor/` from the deploy and unregister the old service worker (ship a one-line `sw.js` that unregisters itself). Drop `claim_membership(p_trip)` and `trip_secrets`.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US3 → US2 → US4. These four stories are the **MVP**; ship to `/next/` after Phase 6.
- US5 needs US3 (adds stops). US6 needs US3 (stops) and US2 (status). US7 needs US5 (Suggest) and `AddToPlanSheet`. US8 needs US1 and, for T092, US7.
- **Needs a person**: T004 (before any sign-in test on `/next/`), T081 (before AI works), T104 (go-live).
- [P] tasks touch separate files and can run alongside their neighbours.

## Implementation Strategy

1. Phases 1–2, then stop and confirm sign-in works on `/next/`.
2. One story at a time in the order above; each ends with its Playwright flow and a commit.
3. The old app stays live at the root until T104, so the trip is never without a working app.

## Notes

- Match `docs/wireframes.html` for layout and `docs/design-system.md` for colour, type and components. When they disagree with this file, the wireframes win for layout and this file wins for behaviour.
- Keep copy short: a title and at most one supporting line per row.
- Do not add features that are not in spec.md.
