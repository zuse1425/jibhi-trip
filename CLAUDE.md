# CLAUDE.md — Jibhi Trip App

Group trip companion for 4 friends (Jibhi · Jalori · Tirthan, 13–16 Nov 2026). Static PWA on GitHub Pages + Supabase (Google sign-in, RLS, Realtime).

## Read first
- `docs/trip-context.md` — the full trip plan, people, timings, decisions (source of truth for content).
- `.specify/memory/constitution.md` — principles (phone-first, place-first map links, live + offline, zero build, RLS, plan vs ideas).
- `specs/001-trip-companion-app/` — spec, plan, data model, tasks (check `tasks.md` for what's left).

## Workflow (Spec Kit / SDD)
New work: `/speckit-specify` → `/speckit-clarify` (optional) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. Keep `tasks.md` checkboxes current.

## Stack & files
- `index.html` (shell + static info sections), `app.css`, `app.js` (all logic), `config.js` (Supabase URL + publishable key).
- `vendor/supabase.js` = supabase-js v2.119 UMD (no CDN). No build step.
- `supabase/schema.sql` (idempotent; **never put the passcode in it**), `supabase/seed.sql`, `data/seed.json` (offline fallback, keep in sync with seed.sql).
- Deploy: push to `main` → `.github/workflows/pages.yml` → GitHub Pages.

## Supabase
- Project `jibhi-trip`, ref `zbiqeoybfzrmdfqqecqa`, region ap-south-1, org "zuse1425's Org". URL `https://zbiqeoybfzrmdfqqecqa.supabase.co`.
- Trip id `jibhi-nov-2026`. Sign-in = Google. Only emails in `trip_allowlist` can join (add rows in the SQL editor). **Never commit email addresses.**
- Auth → Providers → Google must be ON (Google Cloud OAuth client); redirect URL `https://zuse1425.github.io/jibhi-trip/` in Auth → URL Configuration.
- After any DDL: run security + performance advisors.

## Conventions
- Times are IST `HH:MM` + `date` (YYYY-MM-DD). Stops are soft-deleted (`deleted = true`).
- Every place gets 📍 Map + 🧭 Go links (Google Maps; `query_place_id` when known).
- Test at 390×844 with Playwright before pushing (`python3 -m http.server` + chromium).
