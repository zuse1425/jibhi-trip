# Data Model (Supabase · schema `public`)

All rows carry `trip_id text` (`'jibhi-nov-2026'`). Source of truth: `supabase/schema.sql`. Membership check: `private.is_member(trip_id)`.

| Table | Key | Columns | Who can write |
|---|---|---|---|
| `trip_allowlist` | (trip_id, email) | name | nobody from the app (SQL editor only; never committed) |
| `trip_secrets` | trip_id | passcode | legacy, unused; unreadable |
| `members` | (trip_id, user_id) | name, joined_at | via `claim_membership` RPC; rename self |
| `trip_pages` | (trip_id, id) | html (ids: title, lead, reach, know, footer) | SQL editor only |
| `days` | (trip_id, id) | sort, kicker, title, stay, route, opt (`A`/`B`/null) | members |
| `stops` | id uuid | day, date, t `HH:MM`, kind (meet/meal/drive/do/stay/hike), name, area, q, pid, map_url, note, tag, label, alts jsonb `[{label,q,pid}]`, leg jsonb `{mode,text,url}`, idea jsonb `{title,text,links[]}`, deleted, updated_by, updated_at | members (soft delete) |
| `suggestions` | id uuid | day, title, area, map_url, note, status (open/decided/dropped), stop_id, created_by, created_at, updated_at | members |
| `votes` | (suggestion_id, user_id) | trip_id | own row |
| `comments` | id uuid | suggestion_id, user_id, text, created_at | own row |
| `messages` | id uuid | user_id, text, **photo** (Storage path `<trip>/<uuid>.jpg` or null), created_at | own row |
| **`trip_settings`** | (trip_id, key) | value jsonb, updated_by, updated_at. Keys: `chosen_opt` → `"A"` / `"B"` / null | members |
| **`expenses`** | id uuid | title (1–120), amount int ₹ (1–1 000 000), kind (food/stay/cab/fuel/toll/fun/other), paid_by text (a `PEOPLE` name), split text[] (≥ 1 name), deleted, created_by, created_at, updated_at | members (soft delete) |
| **`locations`** | (trip_id, user_id) | lat, lng, acc (m), updated_at | own row (insert/update/delete) |

**Storage**: bucket `trip-photos` (private, ≤ 5 MB, image/jpeg|webp|png). Object path `<trip_id>/<uuid>.jpg`; read/insert for members of that trip, delete own.

**Functions**: `private.is_member(trip)`, `claim_membership(trip) → name|null`, triggers `touch` (stops, trip_settings: updated_at + updated_by) and `touch_s` (suggestions, expenses, locations: updated_at).
**Realtime publication**: stops, suggestions, votes, comments, messages, members, days, trip_settings, expenses, locations (votes + locations replica identity full).

### Derived (client)
- `chosenOpt()` = `trip_settings[chosen_opt].value`; `visibleDays()` = days without `opt` or with `opt === chosenOpt()` (all if none chosen).
- `shares(amount, names)` → `{name: ₹}`: `floor(amount/n)` each, +1 to the first `amount % n` names in `PEOPLE` order.
- `balances()` → per person `{paid, share, net = paid − share}` over non-deleted expenses; `settle()` → `[{from, to, amount}]`.

### Map link rules (client)
- 📍 Map: `map_url` if set → else Google Maps search on `q` (+ `query_place_id=pid`) → else `name + area`. Locations: search on `lat,lng`.
- 🧭 Go: `map_url` if set → else directions to `q`/`pid` (locations: `lat,lng`).
