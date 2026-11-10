# Data model: Trip Platform (Supabase, schema `public`)

Source of truth after the build: `supabase/schema.sql` (idempotent). All changes are **additive** to the 001 schema; existing rows stay valid. Every table has RLS on. `trip_id` stays `text`.

## Tables

### New

| Table | Key | Columns | Notes |
|---|---|---|---|
| `trips` | `id text` | `name text`, `start_date date`, `end_date date`, `timezone text default 'Asia/Kolkata'`, `currency text default 'INR'`, `owner_id uuid`, `cover_url text`, `created_at timestamptz` | New ids: slug of the name + 6 random chars. Backfill one row for `jibhi-nov-2026` |
| `journey_legs` | `id uuid` | `trip_id`, `user_id uuid`, `date date`, `sort int`, `mode text` (bus/cab/train/flight/walk/other), `title text`, `from_name text`, `to_name text`, `depart text` (HH:MM), `arrive text` (HH:MM), `note text`, `lat`, `lng` (destination, nullable), `updated_at` | A person's own steps. A leg may list a second traveller in `with_user_ids uuid[]` |
| `locations` | `(trip_id, user_id)` | `lat double precision`, `lng double precision`, `accuracy real`, `updated_at timestamptz` | Latest position only; row deleted when sharing is turned off |
| `expenses` | `id uuid` | `trip_id`, `title text`, `amount_paise bigint check (> 0)`, `paid_by uuid`, `category text`, `spent_on date`, `note text`, `created_by uuid default auth.uid()`, `created_at`, `updated_at`, `deleted boolean default false` | |
| `expense_shares` | `(expense_id, user_id)` | `trip_id`, `share_paise bigint check (>= 0)` | Shares of an expense must sum to `amount_paise` (checked in `save_expense`) |
| `settlements` | `id uuid` | `trip_id`, `from_user uuid`, `to_user uuid`, `amount_paise bigint check (> 0)`, `note text`, `created_by uuid`, `created_at` | A payment made to square up |

### Changed (add columns only)

| Table | Added | Notes |
|---|---|---|
| `members` | `role text not null default 'member'` (owner/member), `upi_id text` | Backfill: Naman's row becomes `owner` for the Jibhi trip |
| `trip_allowlist` | `invited_by uuid`, `created_at timestamptz default now()` | Acts as the invite list |
| `stops` | `lat double precision`, `lng double precision` | Backfill by geocoding existing `q`/`name + area` once (task T052) |
| `messages` | `kind text not null default 'text'` (text/idea/system), `suggestion_id uuid` | An idea posts a message of kind `idea` pointing at its suggestion |

### Unchanged

`days`, `suggestions` (the "ideas"), `votes`, `comments` (kept, not shown in v2 UI), `trip_pages`, `trip_secrets` (unused; drop later).

## Functions (all `security definer`, `search_path = public`, execute granted to `authenticated` only)

| Function | Returns | Behaviour |
|---|---|---|
| `is_member(p_trip text)` | boolean | Exists. Unchanged |
| `is_owner(p_trip text)` | boolean | Caller's member row has `role = 'owner'` |
| `claim_memberships()` | setof text | For every `trip_allowlist` row matching the caller's JWT email, insert a `members` row if missing; return the trip ids the caller belongs to. Replaces `claim_membership(p_trip)` (keep the old one until switch-over) |
| `create_trip(p_name, p_start, p_end, p_emails text[])` | text (trip id) | Creates the trip, one `days` row per date, the caller as owner (name from JWT `full_name`), and allowlist rows for the emails |
| `invite_member(p_trip, p_email, p_name)` / `remove_member(p_trip, p_user)` | void | Owner only. Removing deletes the member and allowlist rows, never expenses |
| `save_expense(p_expense jsonb, p_shares jsonb)` | uuid | Insert or update an expense and replace its shares in one transaction; rejects if shares do not sum to the amount, or if the caller is neither creator nor payer on update |
| `trip_balances(p_trip text)` | table(`user_id uuid`, `net_paise bigint`) | `paid − share + settlements paid − settlements received`, members only. The client also computes this from cached rows; the function is the reference for tests |

## Row-level security

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `trips` | member | via `create_trip` only | owner | none (archive later) |
| `members` | member of same trip | via functions | own row (name, upi_id); owner any | via `remove_member` |
| `trip_allowlist` | owner | via functions | none | via functions |
| `days`, `stops`, `suggestions` | member | member | member | soft delete only |
| `journey_legs` | member | self or owner | self or owner | self or owner |
| `locations` | member | self | self | self |
| `messages`, `votes` | member | self | none | self |
| `expenses`, `expense_shares` | member | via `save_expense` | via `save_expense` (creator or payer) | soft delete by creator or payer |
| `settlements` | member | `from_user` or `to_user` is the caller | none | creator |
| `trip_pages` | member | owner | owner | owner |

"member" means `is_member(trip_id)`; "self" means `user_id = auth.uid()`.

## Realtime

Publication `supabase_realtime` gains: `trips`, `journey_legs`, `locations`, `expenses`, `expense_shares`, `settlements`, `days`. Set `replica identity full` on `locations`, `expense_shares` and `votes` so deletes carry their keys.

## Indexes

`journey_legs(trip_id, user_id, date, sort)`, `expenses(trip_id, spent_on desc)`, `expense_shares(trip_id)`, `settlements(trip_id)`, `members(user_id)`.

## Carry-over of the Jibhi trip

1. Insert `trips('jibhi-nov-2026', 'Jibhi · Jalori · Tirthan', 2026-11-13, 2026-11-16, owner = Naman)`.
2. Set Naman's `members.role = 'owner'`.
3. Convert the "Getting to Hoshiarpur" content in `trip_pages.reach` into `journey_legs` for the four people. Legs are keyed by `user_id`, so a person's legs can only be inserted after they have signed in once; until then keep the `reach` page visible on Today as a fallback.
4. Geocode stops into `lat`/`lng` (T052).

Never commit emails, phone numbers or UPI IDs; add them through the app or the SQL editor.
