# Feature Specification: Trip Companion App (Jibhi · Jalori · Tirthan)

**Feature Branch**: `001-trip-companion-app`
**Created**: 2026-11-10
**Status**: Implemented (v1), in field test
**Input**: "One place for the four of us: the itinerary with times and Google Maps links, a live 'now/next', suggestions we can vote on and turn into plan items, and chat — synced automatically, hosted on GitHub Pages with Supabase."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See what's happening now and where to go (Priority: P1)
On the trip, any of us opens the app and immediately sees what we're doing now, what's next, and one-tap directions.

**Why this priority**: This is the core on-trip value; everything else is secondary.

**Independent Test**: Open the app at any time between Fri 13 07:45 and Mon 16 evening (IST) → the Now card shows the current and next stop with 📍 Map / 🧭 Go; the matching stop is highlighted (NOW / NEXT) in the timeline.

**Acceptance Scenarios**:
1. **Given** it's before the trip, **When** I open the app, **Then** I see a countdown and a link to my leave time.
2. **Given** it's Sat 14 at 11:00, **When** I open the app, **Then** "Now: Serolsar Lake" and "Next: Jalori Pass dhabas" are shown, and the Serolsar stop is highlighted.
3. **Given** Sun/Mon has two options (A Tirthan, B Manali), **When** it's Sunday, **Then** the Now card shows both options until one is chosen.
4. **Given** no network, **When** I open the app, **Then** the last synced plan loads.

### User Story 2 — Itinerary with places, legs and meals (Priority: P1)
Each day is a timeline of stops (time, place name, area, note, meal tag), with transit legs between stops and soft "along the way" ideas.

**Independent Test**: Every stop with a place has 📍 Map and 🧭 Go links that open Google Maps; each day has a full-day route link.

### User Story 3 — Suggest, vote, decide (Priority: P2)
Anyone posts a place idea (title, area, optional Maps link, day). Others 👍 vote and comment. Anyone can ✅ Decide, which asks for day/date/time and adds it to the plan; Drop/Reopen are available.

**Independent Test**: Post an idea on phone A → appears on phone B within seconds → vote on B → count updates on A → Decide on A → new stop appears in B's plan.

### User Story 4 — Group chat (Priority: P2)
A simple chat tab with names, timestamps, day separators, unread badge. Messages sync live.

### User Story 5 — Edit the plan (Priority: P3)
Edit mode lets any member add, edit (time, place, area, Maps link, note, meal tag, travel leg) or delete stops. Deletes are soft (`deleted = true`).

### User Story 6 — Getting there (Priority: P1, static)
Per-person leave times and routes to Hoshiarpur bus stand (Mitali/Pathankot 5:30, Naman/Mohali 4:30, Himanshu Barnala→Ludhiana Thu eve, Himanshu+Sirisha Ludhiana 6:00 cab), with map links and Plan B.

### Edge Cases
- Two people edit the same stop at once → last write wins (acceptable for 4 people).
- Offline writes → queued in localStorage outbox and flushed on reconnect.
- Wrong passcode → join rejected; nothing readable.
- Supabase project paused (7 days idle) → app shows cached copy; restore from dashboard.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Show the itinerary for Fri 13 – Mon 16 Nov grouped by day, with Option A/B for Sun–Mon.
- **FR-002**: Each stop has time (IST), kind, place name, area, optional note/meal tag/alternatives, optional travel leg and optional "along the way" idea.
- **FR-003**: Each place has 📍 Map (Google Maps search, place_id when known, or a pasted Maps URL) and 🧭 Go (directions) links.
- **FR-004**: Device clock drives a Now/Next card and NOW/NEXT highlighting; refresh every 60 s.
- **FR-005**: Join with name + shared passcode (anonymous auth + `join_trip` RPC); no email/accounts.
- **FR-006**: Ideas board: create, vote/unvote, comment, decide (→ creates stop), drop, reopen.
- **FR-007**: Chat: send, live receive, unread badge.
- **FR-008**: Edit mode: add/edit/soft-delete stops.
- **FR-009**: Live sync via Supabase Realtime for stops, suggestions, votes, comments, messages, members.
- **FR-010**: Offline: cached state + write outbox; installable PWA (manifest + service worker).
- **FR-011**: Reference info: tolls/taxes, café guide with ratings and map links, fun extras, Bollywood spots, packing.

### Key Entities
- **Day** (id, kicker, title, stay, route, opt), **Stop**, **Suggestion**, **Vote**, **Comment**, **Message**, **Member** — see `data-model.md`.

## Success Criteria
- **SC-001**: A change on one phone shows on the others in < 5 s when online.
- **SC-002**: App opens with plan visible in < 2 s on a mid-range Android, including offline.
- **SC-003**: All four members join before Thu 12 Nov night.
- **SC-004**: Zero data readable without the passcode (verified with an un-joined anonymous session).
