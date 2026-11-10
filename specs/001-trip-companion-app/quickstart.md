# Quickstart & Validation

## Run locally
```bash
cd jibhi-trip && python3 -m http.server 8000
```
Open <http://localhost:8000/> — the real app needs Google sign-in (redirect URL must be allow-listed in Supabase for localhost to work).

## Automated e2e (mocked Supabase, 390×844)
```bash
node tests/e2e.js        # serves the repo itself; screenshots → tests/out/
```
The script routes `vendor/supabase.js` to `tests/mock-supabase.js` (an in-memory stand-in seeded from `data/seed.json`), so every screen and the outbox can be exercised without OAuth.

## Field test (T024) — two phones, both signed in
1. **Sync**: Phone A edits a stop time → Phone B updates < 5 s.
2. **Ideas**: A posts an idea → B votes → A sees 👍 1 → A ✅ Decides → stop appears on B.
3. **Chat**: B sends → A's Chat badge shows 1.
4. **Offline**: A in airplane mode → add expense + chat message → "Offline · 2 changes waiting" → airplane off → both appear on B.
5. **Option (US7)**: A taps "Go with B" → B shows only Manali; "Change" restores both.
6. **Money (US8)**: add ₹800 breakfast paid by Naman, all four → everyone sees Naman +₹600 and 3 transfers of ₹200.
7. **Photo (US9)**: B sends a camera photo → appears on A in chat + Photos grid; B deletes it → gone on A.
8. **Location (US10)**: A switches on "Share my location" → B sees A with map link; A switches off → A disappears on B (pull ↻ Refresh if needed).
9. **Security (SC-004)**: sign in with a Google account not on the allowlist → signed out, nothing shown.
