# Jibhi Trip App Constitution

## Core Principles

### I. Phone-first, small groups
The app serves small groups of friends on Android and iOS phones through the browser (installable web app, no app store).
Every screen is designed at 360–430 px wide first: tap targets ≥ 44 px, readable at arm's length, works one-handed.
A user can belong to several trips. No feature is added "for scale"; we optimise for groups of 2 to 12.

### II. Place-first, map-linked
Every stop shows *where* it physically is (place name + area) and has a one-tap Go link that opens Google Maps directions.
The in-app map shows a day's stops in order and where people are. Location is the primary information, then time, then notes.

### III. Live sync, offline-tolerant
Supabase is the single source of truth; changes from any phone appear on all phones in seconds (Realtime).
The app must still open and show the last synced data with no network (mountain valleys), and queue writes until back online.

### IV. Static hosting, no server of our own
The frontend is a static build (`web/`, Vite + React) that runs on any static host. A build step is allowed; host-specific features are not.
The only server code is Supabase: SQL functions and Edge Functions. Secrets live in Supabase, never in the repo or the browser.

### V. Secure by default with a public repo
The repo is public. Only the publishable key lives in code; Row Level Security restricts every table to trip members.
Nothing trip-specific is rendered or fetched before sign-in. Membership comes from each trip's invite list by Google email.
Emails, phone numbers, UPI IDs and trip content are **never committed**.

### VI. Plan vs. ideas
The itinerary holds what we've agreed. Anything undecided is an idea card in the group chat (suggest → vote → Add to plan).

### VII. Calm, consistent design
All UI follows `docs/design-system.md`: its colour tokens, type scale, components and UX rules. One primary action per screen, at most five tabs, few words.

### VIII. AI proposes, people decide
The AI helper can search and suggest, and returns cards. It never changes data by itself; every change is a person's tap.
AI conversations are not stored on the server, and people's names are not sent to the AI provider.

## Constraints
- First trip: Jibhi, Fri 13 – Mon 16 Nov 2026. Times are stored as `HH:MM` strings in the trip's timezone (default IST) with a `date`. Money is stored as whole paise.
- Supabase free tier (project `jibhi-trip`, ref `zbiqeoybfzrmdfqqecqa`, region ap-south-1). Free projects pause after 7 days idle.
- Sign-in is Google OAuth (Supabase Google provider); anonymous sign-ins are not used.

## Development Workflow
- Spec-driven: changes start in `specs/` (spec → plan → tasks) using the `/speckit-*` skills, then implementation.
- Schema changes go in `supabase/schema.sql` (idempotent) and are applied as migrations; run Supabase security advisors after DDL.
- Test on a 390×844 viewport (Playwright) before pushing; `main` auto-deploys to GitHub Pages.
- Pure logic (money, time, now/next) has unit tests.

## Governance
This constitution guides all specs and plans. Amend it via `/speckit-constitution` when trip needs change.

**Version**: 2.0.0 | **Ratified**: 2026-11-10 | **Last Amended**: 2026-11-10 (v2.0.0: multi-trip, build step allowed, design system and AI principles added for feature 002)
