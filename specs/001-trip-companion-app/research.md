# Research & Decisions (v2)

| # | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| R1 | Option pick stored as `trip_settings(trip_id, key, value jsonb)` row `chosen_opt` | Small key/value table is reusable for future toggles; one row, realtime-able, fits the outbox (upsert on `trip_id,key`) | Column on `days` (two rows to keep consistent); localStorage only (not shared) |
| R2 | Hide, don't delete, the unpicked option | Reversible ("Change"); stops stay for reference/history | Soft-deleting the other day's stops (hard to undo) |
| R3 | Expense participants = `config.PEOPLE` names, not `user_id`s | Works before all four have signed in; names are already public in `config.js`; exactly four people (constitution I) | `user_id` arrays (break until everyone joins) |
| R4 | Whole-rupee integers, remainder to first people in `PEOPLE` order | No float drift; shares sum exactly; deterministic on every phone | numeric(10,2) paise split |
| R5 | Greedy settle-up (largest debtor ↔ largest creditor) | ≤ n−1 transfers, optimal enough for 4 people, trivial code | Min-cash-flow search (overkill) |
| R6 | Photos ride on `messages.photo` (path) | Reuses chat realtime + ordering; gallery = messages with a photo | Separate `photos` table (more sync code) |
| R7 | Client-side downscale to 1600 px JPEG q≈0.82 via canvas | Mountain networks; ≈ 300 KB keeps free-tier Storage ample; zero deps | Upload originals (5–10 MB each) |
| R8 | Private bucket + signed URLs (6 h) | Public repo/URL; only members may read photos (SC-004) | Public bucket (anyone with the URL) |
| R9 | `locations` keeps only the latest point per user, deleted on stop/sign-out | Privacy by default; enough for "where is everyone" | History/trail table |
| R10 | Move `is_member` to schema `private` | Removes the "SECURITY DEFINER callable via RPC" advisor warning; RLS still uses it | Keep in `public` and accept |
| R11 | Policies `to authenticated` + `(select auth.uid())`; split `days` "for all" policy | Fixes `auth_rls_initplan` and `multiple_permissive_policies` advisor warnings | — |
| R12 | Playwright e2e with a mocked supabase-js (route `vendor/supabase.js`) | Google OAuth can't be automated; mock exercises all UI + outbox paths at 390×844 | Manual-only testing |
