# Feature Specification: Trip Platform

**Feature Branch**: `002-trip-platform` (developed on the session branch)
**Created**: 2026-11-10
**Status**: Approved for build (wireframes accepted by Naman)
**Input**: "Build the whole app: trip creation, itinerary management with a clean UI, exploring with AI and maps, group chat, expense splitting like Splitwise, where everyone is, a map of all places. Clean, not cluttered. Web only (some of us use iPhones)."

Wireframes: `docs/wireframes.html` · Design system: `docs/design-system.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and open my trip (Priority: P1)

I open the link, sign in with Google and land on my trips. I see only trips I was added to. I tap one and I'm inside it.

**Why this priority**: Nothing else is reachable without it; it also keeps trip data private.

**Independent Test**: An allow-listed account signs in and sees the Jibhi trip; another account signs in and sees an empty list.

**Acceptance Scenarios**:

1. **Given** I am signed out, **When** I open the app, **Then** I see only a sign-in screen and no trip data is requested.
2. **Given** my email is on a trip's invite list, **When** I sign in, **Then** that trip appears in "Your trips" and I am a member.
3. **Given** I have exactly one trip, **When** I sign in, **Then** I land directly on that trip's Today screen.
4. **Given** I am signed in, **When** I sign out, **Then** all cached trip data is removed from the phone.

---

### User Story 2 - Today: what do I do now, and where is everyone? (Priority: P1)

At 5:30 am Mitali opens the app. The top card says "Bus to Hoshiarpur · leave 5:30 · arrive about 7:40" with a Directions button. Below: what the whole group does next, then where each person is.

**Why this priority**: This is the screen used most during the trip; it replaces scrolling a long plan.

**Independent Test**: With journey legs and stops seeded, set the clock to different times and check the cards.

**Acceptance Scenarios**:

1. **Given** I have a personal journey leg in progress or upcoming, **When** I open Today, **Then** "Your next step" shows that leg (title, times, Directions).
2. **Given** I have no personal leg left, **When** I open Today, **Then** "Your next step" shows the group's current or next stop.
3. **Given** the trip has not started, **When** I open Today, **Then** I see a countdown and the first thing I must do.
4. **Given** others have journey legs or shared locations, **When** I open Today, **Then** "Where everyone is" lists each person with a one-line status and an expected arrival time, or "last seen 3 min ago".
5. **Given** I am the person, or the trip owner, **When** I tap a journey, **Then** I can edit its legs.

---

### User Story 3 - Plan: see and edit the itinerary (Priority: P1)

I pick a day and see a short timeline: time, title, one line. I tap a stop to edit it in a bottom sheet, or add a stop. Everyone sees the change within seconds.

**Why this priority**: The itinerary is the core content.

**Independent Test**: Edit a stop on one phone; it changes on a second phone without reloading.

**Acceptance Scenarios**:

1. **Given** a trip with days and stops, **When** I open Plan, **Then** today's day (or the first day) is selected and its stops show in time order.
2. **Given** I tap a stop, **When** the sheet opens, **Then** I can change time, title, place, note and type, or delete it, and Save applies it for everyone.
3. **Given** I tap "Add stop", **When** I enter a title, time and place, **Then** it appears in the right position.
4. **Given** a stop has a place, **When** I tap "Go", **Then** Google Maps opens with directions to it.
5. **Given** I am offline, **When** I edit a stop, **Then** the change shows immediately and syncs when I am back online.

---

### User Story 4 - Money: log spends and split them (Priority: P1)

Sirisha pays ₹1,200 for breakfast. She taps "Add expense", types the amount and "Breakfast", leaves "split equally among all 4" and saves. Everyone's balance updates. At the end, "Settle up" shows the fewest payments needed.

**Why this priority**: Needed from the first hour of the trip; today it is done by hand.

**Independent Test**: Add three expenses with different payers; balances match a hand calculation; settle-up sums to zero.

**Acceptance Scenarios**:

1. **Given** I tap "Add expense", **When** I enter amount, title, who paid and the split, **Then** it is saved and balances update for everyone.
2. **Given** an expense, **When** I choose "custom split", **Then** I can include or exclude people and set exact amounts that must add up to the total.
3. **Given** several expenses, **When** I open Money, **Then** I see my net position, each person's balance and the list of expenses, newest first.
4. **Given** unsettled balances, **When** I tap "Settle up", **Then** I see a minimal list of "A pays B ₹X" with a UPI link where a UPI ID is known, and can mark a payment as done.
5. **Given** I created or paid an expense, **When** I open it, **Then** I can edit or delete it; others can only view it.

---

### User Story 5 - Chat and ideas (Priority: P2)

We chat in one group thread. An idea appears as a card: people tap "I'm in", and one tap adds it to the plan.

**Why this priority**: The current app already has chat and ideas; this merges them into one place.

**Independent Test**: Post an idea, vote from two accounts, add it to the plan, see the system line in chat.

**Acceptance Scenarios**:

1. **Given** I type a message, **When** I send it, **Then** everyone sees it within seconds and the Chat tab shows an unread count for others.
2. **Given** I post an idea (title, optional day and place), **When** others open Chat, **Then** it shows as a card with a vote count and "I'm in".
3. **Given** an idea, **When** anyone taps "Add to plan" and picks a day and time, **Then** a stop is created, the idea is marked decided and a system line appears in chat.
4. **Given** many ideas, **When** I tap "Ideas", **Then** I see only idea cards, open ones first.

---

### User Story 6 - Map and live location (Priority: P2)

I switch Plan to Map. The day's stops are numbered pins joined by a line. My friends appear as labelled dots. I tap a pin for the stop and directions.

**Why this priority**: Makes the day legible at a glance; depends on stops having coordinates.

**Independent Test**: Stops with coordinates show as pins in order; two phones sharing location see each other's dots move.

**Acceptance Scenarios**:

1. **Given** stops with coordinates, **When** I open the map, **Then** they show as numbered pins in time order, fitted to the screen, for the selected day or all days.
2. **Given** I tap a pin, **When** the sheet opens, **Then** I see the stop with Directions and Details.
3. **Given** I turn on "Share my location" and allow it, **When** the app is open, **Then** my position updates for the group about every 30 seconds, and stops when I turn it off or close the app.
4. **Given** a friend's last update is old, **When** I look at their dot, **Then** it is dimmed and labelled with how long ago it was.
5. **Given** a stop has no coordinates, **When** I view the map, **Then** it is listed under "Not on map" with a way to set its place.

---

### User Story 7 - Explore with AI (Priority: P2)

I ask "cafes near Jibhi open after 8 pm on Saturday?". I get a short answer and place cards. Each card has Add to plan, Suggest and Map.

**Why this priority**: The main new planning aid; depends on the plan and chat existing.

**Independent Test**: Ask a place question, get cards, add one to a day, suggest another to chat.

**Acceptance Scenarios**:

1. **Given** I ask a question, **When** the AI answers, **Then** the text streams in and any places come as cards with name, area and a one-line reason.
2. **Given** a place card, **When** I tap "Add to plan", **Then** I pick a day and time and a stop is created with that place.
3. **Given** a place card, **When** I tap "Suggest", **Then** an idea card is posted to the group chat.
4. **Given** the AI knows the trip, **When** I ask "what's missing on Saturday?", **Then** its answer reflects the current plan.
5. **Given** I leave the screen or tap "Clear", **When** I return, **Then** the conversation is gone; nothing was stored on the server.
6. **Given** the AI service fails or is not configured, **When** I ask, **Then** I see a plain message and the rest of the app works.

---

### User Story 8 - Create a new trip (Priority: P3)

I tap "New trip", give it a name and dates, add friends by email and either start blank or let AI draft the days from a one-line description.

**Why this priority**: Turns the app from "this trip" into "any trip"; not needed for Jibhi itself.

**Independent Test**: Create a trip with one invited email; that account sees it after signing in.

**Acceptance Scenarios**:

1. **Given** I fill name and dates, **When** I tap "Start with a blank plan", **Then** the trip exists with one empty day per date and I am its owner.
2. **Given** I added emails, **When** those people sign in, **Then** they see the trip.
3. **Given** I wrote a description and tap "Draft the plan with AI", **When** the draft returns, **Then** I review proposed stops per day and accept all, some or none.
4. **Given** I am the owner, **When** I open trip settings, **Then** I can rename the trip, change dates, add or remove people.

---

### Edge Cases

- No network at open: show the last synced copy with an "Offline" chip; sign-in needs a connection.
- Two people edit the same stop: last save wins; the other sees the new values arrive live.
- Expense in a split of one (paid for self): allowed, changes no balances.
- Rounding: equal splits that don't divide evenly give the extra paise to the payer's share.
- A member is removed while having balances: their expenses stay; they appear as "Former member".
- Location permission denied: the toggle turns itself off and explains how to allow it.
- Stops after midnight: belong to the day they are filed under, not the calendar date.
- AI proposes a place it cannot locate: card shows without Map; "Add to plan" still works with no coordinates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sign-in MUST be Google only; nothing trip-specific is rendered or fetched before sign-in.
- **FR-002**: A user MUST see only trips they are a member of; membership comes from the trip's invite list by email.
- **FR-003**: The app MUST support many trips, each with its own members, plan, chat, expenses and journeys.
- **FR-004**: Any member MUST be able to add, edit and delete stops; deletions are soft.
- **FR-005**: Changes MUST reach other open phones within about 5 seconds without reloading.
- **FR-006**: The app MUST open and show the last synced data offline, and queue edits until online.
- **FR-007**: Each member MUST be able to have personal journey legs; the member and the trip owner can edit them.
- **FR-008**: Today MUST show, in order: my next step, the group's next stop, where everyone is.
- **FR-009**: Members MUST be able to add expenses with payer and equal or custom split; amounts are stored as whole paise.
- **FR-010**: The app MUST compute per-person balances and a minimal settle-up list, and record settlements.
- **FR-011**: Only an expense's creator or payer MUST be able to edit or delete it.
- **FR-012**: Chat MUST support text messages, idea cards with votes, and system lines for plan changes.
- **FR-013**: The map MUST show stops with coordinates as ordered pins and members' shared locations.
- **FR-014**: Location sharing MUST be opt-in per person, only while the app is open, and store only the latest position.
- **FR-015**: The AI assistant MUST answer with the trip's current plan as context and return places as actionable cards.
- **FR-016**: The AI MUST NOT change any data by itself; every change needs a tap.
- **FR-017**: AI conversations MUST NOT be stored on the server; the AI key MUST NOT reach the browser.
- **FR-018**: A signed-in user MUST be able to create a trip and invite people by email; the creator is the owner.
- **FR-019**: The owner MUST be able to edit trip details and manage members.
- **FR-020**: The UI MUST follow `docs/design-system.md` and work from 360 px wide, in light and dark.
- **FR-021**: The existing Jibhi trip (days, stops, pages, members) MUST carry over without re-entry.

### Key Entities

- **Trip**: name, dates, owner, cover. Has members, days, stops, journeys, messages, ideas, expenses.
- **Member / Invite**: a person on a trip (role owner or member); an invite is an email waiting to become a member.
- **Day / Stop**: a dated section of the plan; a stop has time, title, type, place (name, area, coordinates), note.
- **Journey leg**: one person's own step before or between group stops (mode, from, to, depart, arrive).
- **Location**: a member's latest shared position and when it was sent.
- **Message / Idea / Vote**: chat lines; an idea is a votable card that can become a stop.
- **Expense / Share / Settlement**: who paid how much for what, how it is split, and payments made to square up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From opening the app signed in, a person learns their next step without scrolling or tapping.
- **SC-002**: Adding an equally split expense takes at most 3 fields and under 15 seconds.
- **SC-003**: Balances always sum to zero, and settle-up needs at most (people − 1) payments.
- **SC-004**: An edit made on one phone appears on another within 5 seconds on mobile data.
- **SC-005**: With no network, the app opens to the last synced plan in under 2 seconds.
- **SC-006**: Zero trip data is readable without signing in as a member (checked with a signed-out and a non-member session).
- **SC-007**: Every screen has one primary action and no more than five tabs; all tap targets are at least 44 px.
- **SC-008**: The first AI words appear within 5 seconds of asking on mobile data.

## Assumptions

- Groups are small (2 to 12 people); one group thread per trip is enough.
- Everyone has a Google account. Currency is INR; one currency per trip.
- Defaults chosen with the wireframes, changeable later: five tabs with the map inside Plan and ideas inside Chat; each person edits their own journey and the owner can edit anyone's; location only while the app is open; free OpenStreetMap-based map; every member can edit the plan.
- Hosting stays on GitHub Pages plus Supabase for now; the app must not depend on a host-specific feature so it can move later.
- Photo sharing, multi-currency, push notifications and background location are out of scope.
