# Jibhi Trip App Constitution

## Core Principles

### I. Phone-first, four people
The app serves exactly one small group (Naman, Mitali, Himanshu, Sirisha) on Android/iOS phones.
Every screen is designed at 360–430 px wide first: tap targets ≥ 44 px, readable at arm's length, works one-handed.
No feature is added "for scale"; we optimise for these four people on this trip.

### II. Place-first, map-linked
Every stop shows *where* it physically is (place name + area) and has one-tap 📍 Map and 🧭 Go (directions) links that open Google Maps.
Travel between stops is shown as a transit leg (mode + time/distance). Location is the primary information, then time, then notes.

### III. Live sync, offline-tolerant
Supabase is the single source of truth; changes from any phone appear on all phones in seconds (Realtime).
The app must still open and show the last synced plan with no network (mountain valleys), and queue writes until back online.

### IV. Static hosting, zero build
Plain HTML/CSS/vanilla JS served from GitHub Pages. No bundler, no framework, no server code.
The Supabase client is vendored (`vendor/supabase.js`) so the app never depends on a CDN.

### V. Secure by default with a public repo
The repo is public (GitHub Free Pages). Only the publishable key lives in code; Row Level Security restricts every table to trip members.
Membership is granted only via the `join_trip` RPC with a shared passcode that is **never committed**.

### VI. Plan vs. ideas
The itinerary holds what we've agreed. Anything undecided lives on the Ideas board (suggest → vote → comment → ✅ Decide moves it onto the plan).
"Along the way" ideas (chai stops, lunch towns) are shown as soft suggestions, not fixed stops.

## Constraints
- Trip dates: Fri 13 – Mon 16 Nov 2026, IST (UTC+05:30). All times stored as `HH:MM` IST strings with a `date`.
- Supabase free tier (project `jibhi-trip`, ref `zbiqeoybfzrmdfqqecqa`, region ap-south-1). Free projects pause after 7 days idle.
- Anonymous sign-ins must be enabled in Supabase Auth.

## Development Workflow
- Spec-driven: changes start in `specs/` (spec → plan → tasks) using the `/speckit-*` skills, then implementation.
- Schema changes go in `supabase/schema.sql` (idempotent) and are applied as migrations; run Supabase security advisors after DDL.
- Test on a 390×844 viewport (Playwright) before pushing; `main` auto-deploys to GitHub Pages.

## Governance
This constitution guides all specs and plans. Amend it via `/speckit-constitution` when trip needs change.

**Version**: 1.0.0 | **Ratified**: 2026-11-10 | **Last Amended**: 2026-11-10
