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
