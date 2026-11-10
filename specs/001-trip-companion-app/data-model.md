# Data Model (Supabase · schema `public`)

All rows carry `trip_id text` (`'jibhi-nov-2026'`). Source of truth: `supabase/schema.sql`.

| Table | Key | Columns | Who can write |
|---|---|---|---|
| `trip_secrets` | trip_id | passcode | nobody (server only) |
| `members` | (trip_id, user_id) | name, joined_at | via `join_trip` RPC; rename self |
| `days` | (trip_id, id) | sort, kicker, title, stay, route, opt (`A`/`B`/null) | members |
| `stops` | id uuid | day, date, t `HH:MM`, kind (meet/meal/drive/do/stay/hike), name, area, q, pid, map_url, note, tag, label, alts jsonb `[{label,q,pid}]`, leg jsonb `{mode,text,url}`, idea jsonb `{title,text,links[]}`, deleted, updated_by, updated_at | members (soft delete) |
| `suggestions` | id uuid | day, title, area, map_url, note, status (open/decided/dropped), stop_id, created_by, created_at, updated_at | members |
| `votes` | (suggestion_id, user_id) | trip_id | own row |
| `comments` | id uuid | suggestion_id, user_id, text, created_at | own row |
| `messages` | id uuid | user_id, text, created_at | own row |

**Functions**: `is_member(trip)`, `join_trip(trip, code, name) → boolean`, triggers `touch`/`touch_s`.
**Realtime publication**: stops, suggestions, votes (replica identity full), comments, messages, members.

### Map link rules (client)
- 📍 Map: `map_url` if set → else Google Maps search on `q` (+ `query_place_id=pid`) → else `name + area`.
- 🧭 Go: `map_url` if set → else directions to `q`/`pid`.
