# Implementation Plan: Trip Platform

**Branch**: `002-trip-platform` | **Date**: 2026-11-10 | **Spec**: `specs/002-trip-platform/spec.md`
**Input**: spec.md, `docs/wireframes.html`, `docs/design-system.md`

## Summary

Replace the single-file vanilla app with a React single-page app in `web/`, keeping Supabase as the whole backend (Google sign-in, Postgres with row-level security, Realtime, one Edge Function for AI). The schema is extended in place, so the Jibhi trip carries over. The new app is built and deployed beside the current one (`/next/`) until it is verified, then it takes over the root.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Node 22 for builds; Deno (Supabase Edge Functions) for the one server function; SQL (Postgres 17 on Supabase).

**Primary Dependencies**: Vite, React Router (hash routing), Tailwind CSS v4, shadcn/ui, lucide-react, `@supabase/supabase-js` v2, TanStack Query v5 (+ persist client), MapLibre GL JS with OpenFreeMap tiles, `vite-plugin-pwa`. AI: OpenRouter chat completions (streaming, web search plugin) behind the Edge Function.

**Storage**: Supabase Postgres (project `zbiqeoybfzrmdfqqecqa`). Browser: TanStack Query cache persisted to `localStorage` after sign-in, wiped on sign-out.

**Testing**: Vitest for pure logic (balances, settle-up, "now/next", split rounding). Playwright at 390×844 for one flow per user story. SQL checks through the Supabase advisors after every migration.

**Target Platform**: Mobile browsers (Chrome Android, Safari iOS 16.4+), installable PWA. Desktop works but is not designed for.

**Project Type**: Web app: static frontend + managed backend (no server of our own).

**Performance Goals**: First load under 250 kB gzipped JS before the map; the map chunk loads only when the map opens. Interactive in under 3 s on 4G. Offline open under 2 s.

**Constraints**: Public repo, so no trip data, emails or keys in git. No host-specific features, so the app can move from GitHub Pages to Vercel or Cloudflare Pages unchanged. Free tiers only.

**Scale/Scope**: 2 to 12 people per trip, a handful of trips, 8 screens, about 12 tables.

## Constitution Check

Constitution amended to v2.0.0 with this plan (see `.specify/memory/constitution.md`):

| Principle | Status |
|---|---|
| I. Phone-first, small groups | Pass: 360 px first, 44 px targets, five tabs |
| II. Place-first, map-linked | Pass: every stop has Go; in-app map added |
| III. Live sync, offline-tolerant | Pass: Realtime + persisted query cache + queued mutations |
| IV. Static hosting, no server of our own | Pass: build step now allowed; only server code is one Supabase Edge Function |
| V. Secure by default with a public repo | Pass: RLS on every table; AI key is an Edge Function secret |
| VI. Plan vs. ideas | Pass: ideas are cards in chat until someone adds them |
| VII. Calm, consistent design | Pass: `docs/design-system.md` tokens only |
| VIII. AI proposes, people decide | Pass: AI returns cards; writes only on tap; no chat logs |

## High-level design

```
Phone browser (PWA)
  React SPA  ──────────────►  Supabase Auth (Google)
   │  supabase-js                  │ JWT
   ├── REST/RPC  ────────────►  Postgres + RLS  (trips, members, days, stops, journey_legs,
   │                                             locations, messages, suggestions, votes,
   │                                             expenses, expense_shares, settlements, trip_pages)
   ├── Realtime (websocket) ◄──  postgres_changes per trip
   ├── fetch (SSE) ──────────►  Edge Function `ai-chat` ──► OpenRouter (model + web search)
   ├── tiles ────────────────►  OpenFreeMap (map style + vector tiles)
   └── geocode ──────────────►  Photon (OpenStreetMap place search)
Static files: GitHub Pages (built by GitHub Actions from `web/`)
```

- **Who is trusted with what**: the browser holds only the publishable key and the user's JWT. Every table is protected by RLS keyed on `is_member(trip_id)`. The OpenRouter key exists only as a Supabase Edge Function secret.
- **AI flow**: the client sends the messages so far plus a compact trip summary. The function checks the JWT and trip membership, calls OpenRouter with streaming and returns AG-UI style events over SSE. Place cards arrive as a tool call (`show_places`). The client renders cards; "Add to plan" and "Suggest" are normal client writes under the user's own RLS. Nothing is stored server-side.
- **Location flow**: when the toggle is on and the tab is visible, `navigator.geolocation.watchPosition` upserts one row per member (`locations`) at most every 30 s. Others get it through Realtime.
- **Rollout**: Actions builds `web/` with base `/jibhi-trip/next/` and publishes it beside the current app. After sign-off the base flips to `/jibhi-trip/` and the old files are removed.

## Low-level design

### Routes (`createHashRouter`)

| Path | Screen | Notes |
|---|---|---|
| `/sign-in` | SignIn | Only route available signed out |
| `/` | Trips | Redirects to the only trip's Today if there is exactly one |
| `/new` | NewTrip | |
| `/t/:tripId/today` | Today | Default tab |
| `/t/:tripId/plan` | Plan | `?view=list\|map`, `?day=<id>\|all` |
| `/t/:tripId/explore` | Explore | In-memory conversation only |
| `/t/:tripId/chat` | Chat | `?filter=ideas` |
| `/t/:tripId/money` | Money | |
| `/t/:tripId/settings` | TripSettings | Owner: details + people; everyone: my name, my UPI ID, sign out |

`TripLayout` wraps the five tab routes: loads the trip, subscribes to Realtime, renders `TabBar`.

### Source layout

```text
web/
├── index.html, vite.config.ts, tsconfig.json, package.json, components.json
├── public/                     icons, manifest
└── src/
    ├── main.tsx, router.tsx, index.css        (Tailwind + design tokens as CSS variables)
    ├── lib/
    │   ├── supabase.ts          client from VITE_SUPABASE_URL / VITE_SUPABASE_KEY
    │   ├── query.ts             QueryClient, persister, offline mutation defaults
    │   ├── time.ts              IST helpers, "HH:MM" maths
    │   ├── nowNext.ts           pure: (stops, legs, now) → myNext, groupNext
    │   ├── money.ts             pure: splitEqual, balances, settleUp, formatINR
    │   ├── maps.ts              Google Maps search/directions links
    │   └── geocode.ts           Photon search → {name, area, lat, lng}
    ├── data/                    one file per entity: query keys, useXxx hooks, mutations
    │   ├── auth.ts  trips.ts  members.ts  days.ts  stops.ts  journeys.ts
    │   ├── locations.ts  messages.ts  ideas.ts  expenses.ts  realtime.ts
    ├── components/ui/           shadcn components
    ├── components/              TabBar, ScreenHeader, DayChips, StopRow, StopSheet, PlacePicker,
    │                            PersonRow, Avatar, MoneyAmount, ExpenseSheet, SettleSheet,
    │                            IdeaCard, PlaceCard, AddToPlanSheet, SyncChip, EmptyState
    ├── screens/                 SignIn, Trips, NewTrip, TripLayout, Today, Plan, PlanMap,
    │                            Explore, Chat, Money, TripSettings
    └── ai/                      client.ts (SSE reader), tools.ts (show_places schema), context.ts (trip summary)
supabase/
├── schema.sql                   idempotent, full schema (source of truth)
├── migrations/                  dated copies of what was applied
└── functions/ai-chat/index.ts   the Edge Function
```

### State and data rules

- Server state lives only in TanStack Query. Keys: `['trips']`, `['trip', id]`, `['stops', tripId]`, `['legs', tripId]`, `['locations', tripId]`, `['messages', tripId]`, `['ideas', tripId]`, `['expenses', tripId]`, `['members', tripId]`.
- Each mutation is optimistic: update the cache in `onMutate`, roll back in `onError`, and has a `mutationKey` plus default `mutationFn` registered in `lib/query.ts` so paused mutations resume after a reload.
- `realtime.ts` opens one channel per trip and, for each `postgres_changes` event, patches the matching query cache (insert, update, delete by primary key). On reconnect or tab focus, invalidate all trip queries.
- Client-generated UUIDs for inserts, so optimistic rows keep their identity.
- UI state (selected day, sheet open, list/map) lives in the URL or component state. No global store.

### Key algorithms (pure, unit-tested)

- **Now/next** (`nowNext.ts`): sort the day's stops by time; "current" is the last stop whose time ≤ now, "next" is the first after. `myNext` is my first journey leg with `arrive > now` and `date = today`, otherwise the group "next". Before the trip: countdown to my first leg, or the first stop.
- **Person status**: active leg → "`{mode}` from `{from}`" + "about `{arrive}`"; else fresh location (under 10 min) → nearest stop name if within 300 m, otherwise "last seen `{n}` min ago"; else "At `{current stop}`" by plan.
- **Equal split** (`money.ts`): `base = floor(total / n)`; everyone gets `base`; the remainder paise go to the payer if included, otherwise to the first person.
- **Balances**: `net[u] = paid[u] − share[u] + settlementsPaidBy[u] − settlementsReceivedBy[u]`. Invariant: sum is 0.
- **Settle up**: repeatedly match the largest debtor with the largest creditor for `min(|debt|, credit)` until all are 0. At most `n − 1` payments.
- **UPI link**: `upi://pay?pa={upi}&pn={name}&am={rupees}&cu=INR&tn={trip name}`; shown only if the payee saved a UPI ID.

### Edge Function `ai-chat`

Contract in `contracts/ai-chat.md`. Steps: verify JWT → check `is_member(trip_id)` using the caller's JWT → build the system prompt (role, trip summary, today's date, rules: short answers, use `show_places` for places, never claim to have changed the plan) → call OpenRouter (`stream: true`, web search plugin on, tool `show_places`) → translate the stream into SSE events → no logging of content. Model id comes from the `AI_MODEL` secret so it can be changed without a deploy. Rate limit: 30 requests per user per hour, counted in memory per instance (good enough for this scale).

### Map

`PlanMap` lazy-loads MapLibre. Style: OpenFreeMap "liberty". Pins are HTML markers (numbered, sun colour for selected). The route is a GeoJSON line through the pins in order (straight segments, not road routing). People are markers from `locations`. Tapping a pin opens a bottom sheet with Directions (Google Maps link) and Details (opens `StopSheet`).

### Offline and PWA

`vite-plugin-pwa` precaches the app shell. Data comes from the persisted query cache, restored only when a session exists. Sign-out clears the cache, the outbox and Supabase auth storage, then reloads.

## Project Structure

### Documentation (this feature)

```text
specs/002-trip-platform/
├── spec.md
├── plan.md            (this file)
├── research.md        decisions and alternatives
├── data-model.md      tables, policies, functions
├── contracts/ai-chat.md
└── tasks.md
```

### Source Code (repository root)

`web/` (new app, described above), `supabase/` (schema, migrations, function). The current app (`index.html`, `app.js`, `app.css`, `sw.js`, `config.js`, `vendor/`) stays until the switch-over task.

**Structure Decision**: one frontend project in `web/`; the backend is configuration in `supabase/`. No custom server.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Build step (Vite/React) | Eight screens with sheets, live data and a map are not maintainable in one vanilla file; shadcn gives a consistent, accessible UI | Staying vanilla would repeat the "looks unfinished" problem |
| One Edge Function | The AI key must not reach browsers | Fetching the key into the app lets any member copy it |
| MapLibre + OpenFreeMap | In-app map of stops and people with no billing account | Google Maps JS needs billing; links alone give no overview |
