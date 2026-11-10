# Feature Specification: Trip Companion App (Jibhi · Jalori · Tirthan)

**Feature Branch**: `001-trip-companion-app`
**Created**: 2026-11-10 · **Updated**: 2026-11-10 (v2: Google sign-in, Phase 5 stories US7–US10)
**Status**: v1 implemented and in field test · v2 (US7–US10) specified
**Input**: "One place for the four of us: the itinerary with times and Google Maps links, a live 'now/next', suggestions we can vote on and turn into plan items, and chat — synced automatically, hosted on GitHub Pages with Supabase." · v2: "Mark the Sun/Mon option we pick, split expenses, share photos, and optionally share live location."

## Clarifications

### Session 2026-11-10
- Q: How do people get in? → A: Google sign-in; only emails on the server-side `trip_allowlist` become members (`claim_membership`). No passcode, no anonymous auth. Nothing trip-specific is shown before sign-in.
- Q: Who can pick Option A/B? → A: Any member, any time; it can be changed back. The unpicked option is hidden everywhere (plan, day nav, Now card, day pickers) but its stops are kept.
- Q: Expense currency/precision? → A: Whole rupees (₹, integers). Split equally among the people ticked (default: all four). Participants are the four names in `config.js` `PEOPLE`, so expenses work even before everyone has signed in.
- Q: Who can edit/delete an expense? → A: Any member (soft delete). Last write wins, same as stops.
- Q: Where do photos live? → A: Posted into Chat (photo + optional caption) and also shown as a Photos grid. Stored in a private Supabase Storage bucket, resized on the phone to ≤ 1600 px JPEG. Uploading needs a connection (not queued offline).
- Q: Live location? → A: Strictly opt-in per phone, only while the app is open, only the latest point is stored (no history), and stopping or signing out deletes it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See what's happening now and where to go (Priority: P1)
On the trip, any of us opens the app and immediately sees what we're doing now, what's next, and one-tap directions.

**Why this priority**: This is the core on-trip value; everything else is secondary.

**Independent Test**: Open the app at any time between Fri 13 07:45 and Mon 16 evening (IST) → the Now card shows the current and next stop with 📍 Map / 🧭 Go; the matching stop is highlighted (NOW / NEXT) in the timeline.

**Acceptance Scenarios**:
1. **Given** it's before the trip, **When** I open the app, **Then** I see a countdown and a link to my leave time.
2. **Given** it's Sat 14 at 11:00, **When** I open the app, **Then** "Now: Serolsar Lake" and "Next: Jalori Pass dhabas" are shown, and the Serolsar stop is highlighted.
3. **Given** Sun/Mon has two options (A Tirthan, B Manali), **When** it's Sunday and no option is picked, **Then** the Now card shows both options; once one is picked (US7) only that one.
4. **Given** no network, **When** I open the app (signed in before on this phone), **Then** the last synced plan loads.

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
Per-person leave times and routes to Hoshiarpur bus stand, with map links and Plan B. Content lives in the members-only `trip_pages` table (not in the public HTML).

### User Story 7 — Lock in the Sun/Mon option (Priority: P1)
On Saturday we decide between Option A (Tirthan) and Option B (Manali). Anyone taps "Go with A/B"; from then on every phone shows only the chosen option.

**Why this priority**: Without it, Sunday's Now card and plan show two parallel itineraries — confusing exactly when we're on the road.

**Independent Test**: Tap "Go with B" on phone A → within seconds phone B's plan, day nav and Now card show only Option B; "Change" restores both.

**Acceptance Scenarios**:
1. **Given** no option picked, **When** I view the plan, **Then** both options are shown with "✅ Go with A" / "✅ Go with B" buttons.
2. **Given** someone picked B, **When** I open the app, **Then** Option A's section, nav chip and Now-card row are hidden and a "Going with B · Manali · Change" banner shows.
3. **Given** B is picked, **When** I add a stop or suggestion, **Then** the day picker doesn't offer Option A.

### User Story 8 — Split expenses (Priority: P2)
Whoever pays (cab, stay, food, tolls) adds it: what, ₹ amount, who paid, split among whom. The Money tab shows totals, each person's balance and the fewest "X pays Y ₹N" transfers to settle up.

**Why this priority**: Settling up after the trip is the one thing WhatsApp does badly; useful from day 1 but not needed to navigate.

**Independent Test**: Naman adds "Breakfast ₹800, paid by Naman, all four" → every phone shows Naman +₹600, others −₹200 each and three "→ Naman ₹200" transfers.

**Acceptance Scenarios**:
1. **Given** an expense split among 3 of 4, **When** balances compute, **Then** only those 3 owe a share; the 4th is unaffected.
2. **Given** an amount that doesn't divide evenly (₹100 / 3), **When** balances compute, **Then** shares are whole rupees and still sum to the amount.
3. **Given** I'm offline, **When** I add an expense, **Then** it's saved locally and synced when back online (outbox).
4. **Given** a wrong entry, **When** anyone edits or deletes it, **Then** balances update on all phones.

### User Story 9 — Share photos (Priority: P3)
From Chat, tap 📷, pick/take a photo, add an optional caption, send. Everyone sees it in the chat and in a Photos grid; tapping opens full size. You can delete your own photos.

**Independent Test**: Phone A sends a photo → it appears in phone B's chat and Photos grid within seconds; an un-allowlisted account can't read the file.

**Acceptance Scenarios**:
1. **Given** a 12 MP camera photo, **When** I send it, **Then** it's downscaled to ≤ 1600 px JPEG (≈ 200–400 KB) before upload.
2. **Given** I'm offline, **When** I tap 📷, **Then** I'm told photos need a connection (text chat still queues).
3. **Given** my own photo, **When** I delete it, **Then** the message and stored file are removed.

### User Story 10 — Where is everyone (opt-in live location) (Priority: P3)
On Info, I can switch on "Share my location". While my app is open, my latest position is shared with the group; others see "Mitali · 4 min ago · 1.2 km away · 📍 Map · 🧭 Go". I can switch it off any time.

**Independent Test**: Phone A switches sharing on → phone B lists A with a working map link; A switches off → A disappears from B.

**Acceptance Scenarios**:
1. **Given** sharing is off (default), **Then** no location is read or stored.
2. **Given** sharing is on, **When** I move > 100 m or 2 minutes pass, **Then** my stored point updates (at most once a minute).
3. **Given** a point older than 30 min, **Then** it's shown as stale (greyed, "last seen").
4. **Given** I switch off or sign out, **Then** my row is deleted.

### Edge Cases
- Two people edit the same stop/expense at once → last write wins (acceptable for 4 people).
- Offline writes → queued in localStorage outbox and flushed on reconnect (stops, ideas, chat text, expenses, option pick). Photos and location are online-only.
- Google account not on the allowlist → signed out immediately with a message; nothing readable.
- Supabase project paused (7 days idle) → app shows cached copy; restore from dashboard.
- Both options picked "simultaneously" by two people → last write wins; banner shows the result.
- Location permission denied → toggle turns back off with a message.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: Show the itinerary for Fri 13 – Mon 16 Nov grouped by day, with Option A/B for Sun–Mon.
- **FR-002**: Each stop has time (IST), kind, place name, area, optional note/meal tag/alternatives, optional travel leg and optional "along the way" idea.
- **FR-003**: Each place has 📍 Map (Google Maps search, place_id when known, or a pasted Maps URL) and 🧭 Go (directions) links.
- **FR-004**: Device clock drives a Now/Next card and NOW/NEXT highlighting; refresh every 60 s.
- **FR-005**: Sign in with Google; membership only for emails on `trip_allowlist` (`claim_membership` RPC). No trip content is rendered or fetched before sign-in.
- **FR-006**: Ideas board: create, vote/unvote, comment, decide (→ creates stop), drop, reopen.
- **FR-007**: Chat: send, live receive, unread badge.
- **FR-008**: Edit mode: add/edit/soft-delete stops.
- **FR-009**: Live sync via Supabase Realtime for stops, suggestions, votes, comments, messages, members, days, trip settings, expenses, locations.
- **FR-010**: Offline: cached state + write outbox; installable PWA (manifest + service worker). Cache wiped on sign-out.
- **FR-011**: Reference info: tolls/taxes, café guide with ratings and map links, fun extras, Bollywood spots, packing (members-only `trip_pages`).
- **FR-012**: Any member can pick Option A or B for Sun–Mon (stored in `trip_settings`, key `chosen_opt`) or clear it; the unpicked option is hidden in plan, day nav, Now card and day pickers.
- **FR-013**: Money tab: add/edit/delete expenses (title, ₹ integer amount, category, paid by, split among ≥ 1 of the four); show trip total, per-person paid/share/balance and a minimal settle-up transfer list. Shares are whole rupees summing exactly to the amount.
- **FR-014**: Photos: send from chat with optional caption; client-side downscale to ≤ 1600 px JPEG; private Storage bucket readable only by trip members; Photos grid; owner can delete (message + file).
- **FR-015**: Live location: opt-in toggle per device; latest point only (`locations` table), throttled ≥ 60 s between writes; list with age, distance, 📍 Map and 🧭 Go; delete on stop or sign-out; stale after 30 min.
- **FR-016**: Database passes Supabase security + performance advisors, except documented intentional findings.

### Key Entities
- **Day** (id, kicker, title, stay, route, opt), **Stop**, **Suggestion**, **Vote**, **Comment**, **Message** (+ optional photo), **Member**, **TripPage**, **TripSetting**, **Expense**, **Location** — see `data-model.md`.

## Success Criteria
- **SC-001**: A change on one phone shows on the others in < 5 s when online.
- **SC-002**: App opens with plan visible in < 2 s on a mid-range Android, including offline.
- **SC-003**: All four members sign in before Thu 12 Nov night.
- **SC-004**: Zero data (tables or photos) readable by a signed-in Google account that isn't on the allowlist.
- **SC-005**: After the trip, settling up takes ≤ 3 transfers for 4 people.
- **SC-006**: A photo send completes in < 10 s on a 3G-class connection (≤ 400 KB upload).
