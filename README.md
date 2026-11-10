# 🏔️ Jibhi Trip App

One link for our 13–16 Nov trip: the plan with live **Now / Next**, 📍 Google Maps links for every place, an **Ideas** board (suggest → vote → decide), group **Chat** with 📷 photos, **Money** (who paid what + settle up), the Sun/Mon option lock-in and opt-in 📡 *where's everyone*. Everything syncs live between our phones and works offline.

**Open:** https://zuse1425.github.io/jibhi-trip/ → Chrome ⋮ → *Add to Home screen*.
First open: tap **Continue with Google** with the account Naman added to the trip.

### For devs
Static HTML/CSS/JS + Supabase. See `CLAUDE.md`, `docs/trip-context.md` and `specs/001-trip-companion-app/`.
Local preview: `python3 -m http.server` → http://localhost:8000
Tests (mocked Supabase, 390×844): `node tests/e2e.js` → screenshots in `tests/out/`
