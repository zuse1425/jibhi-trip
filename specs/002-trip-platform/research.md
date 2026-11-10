# Research and decisions: Trip Platform

| # | Decision | Why | Alternatives considered |
|---|---|---|---|
| R1 | **Web app (PWA), not native** | Some of the group use iPhones; a web app installs from the browser on both platforms with no store | Flutter/Expo: cannot hand an iOS build to friends without the App Store or TestFlight |
| R2 | **React + Vite SPA**, hash routing | Runs on any static host; no server rendering needed for a signed-in app | Next.js: needs a Node host for API routes; nothing here needs it |
| R3 | **Hosting: GitHub Pages now, host-agnostic** | Already deploying there and Google sign-in is already configured for that address. The build has no host-specific code, so moving to Vercel or Cloudflare Pages later is a settings change | Vercel now: needs a new account and new OAuth settings before any work can ship |
| R4 | **Supabase stays the backend** | Auth, RLS, Realtime and Edge Functions cover every need; data carries over | Own Node backend: more to run and pay for, no benefit at this size |
| R5 | **AI key in an Edge Function secret** | Keeps the key out of browsers; the function also enforces membership | Fetching the key into the app (simplest) lets any member read it |
| R6 | **OpenRouter** with a model set by secret, web search plugin on | One key, any model; search without a second provider | Direct provider SDKs: lock-in; separate search API: extra key |
| R7 | **AG-UI style events over SSE; own chat UI** | CopilotKit's server runtime targets Node, not Deno. The event protocol itself is simple, and the chat UI needs custom cards anyway | CopilotKit end to end: needs a Node host. **Spike T060** confirms whether `@ag-ui/client` fits; if not, a 60-line SSE reader does the same job |
| R8 | **MapLibre GL + OpenFreeMap tiles; Photon for place search** | Free, no key, no billing. Directions still open Google Maps | Google Maps JS + Places: familiar, but needs billing turned on |
| R9 | **TanStack Query with persisted cache** for offline | Built-in optimistic updates, paused mutations and persistence replace the hand-written outbox | Keeping the custom outbox: more code to maintain |
| R10 | **Extend the schema in place, keep `trip_id text`** | The Jibhi data stays valid; migrations are additive | New UUID-keyed schema: needs a data migration days before the trip |
| R11 | **Money in integer paise** | No floating-point drift; balances always sum to zero | Decimal rupees: rounding bugs |
| R12 | **Location: latest position only, foreground only** | Web pages cannot track in the background; storing only the last point limits privacy risk | Location history: not needed, more sensitive |
| R13 | **Design: "Sunrise" palette, shadcn/ui** | See `docs/design-system.md` (with sources) | Keeping the old green theme: user asked for something more hopeful |

## Open items for the build

- T060 spike: `@ag-ui/client` in the browser against a Deno SSE endpoint.
- OpenFreeMap and Photon are free community services with fair-use limits; fine for one group. If either is unreliable, swap the style URL or geocoder in `lib/`.
- Supabase redirect URLs must include the `/next/` address before the new app can sign in (user action, task T004).
