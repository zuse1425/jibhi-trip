# Contract: Edge Function `ai-chat`

`POST https://<project>.supabase.co/functions/v1/ai-chat`

## Request

Headers: `Authorization: Bearer <user JWT>`, `apikey: <publishable key>`, `Content-Type: application/json`.

```json
{
  "trip_id": "jibhi-nov-2026",
  "messages": [
    { "role": "user", "content": "Cafes near Jibhi open after 8 pm on Saturday?" }
  ],
  "context": {
    "trip": { "name": "…", "start": "2026-11-13", "end": "2026-11-16" },
    "days": [ { "id": "d2", "date": "2026-11-14", "title": "…",
                "stops": [ { "t": "09:00", "name": "…", "area": "…" } ] } ],
    "now": "2026-11-12T20:15:00+05:30"
  }
}
```

- `messages`: the whole conversation so far (the server keeps nothing). Max 30 messages, 8,000 characters total; older turns are dropped by the client.
- `context`: built by `web/src/ai/context.ts` from cached data. Names of people are **not** sent; only the plan.

## Response

`200 text/event-stream`. Each event is one line `data: <json>` followed by a blank line. Event shapes follow the AG-UI protocol names:

| `type` | Fields | Meaning |
|---|---|---|
| `RUN_STARTED` | `runId` | Stream opened |
| `TEXT_MESSAGE_CONTENT` | `delta` | Next piece of the answer text |
| `TOOL_CALL_START` | `toolCallId`, `toolCallName` | Currently only `show_places` |
| `TOOL_CALL_ARGS` | `toolCallId`, `delta` | JSON fragments of the arguments |
| `TOOL_CALL_END` | `toolCallId` | Arguments complete; client parses and renders cards |
| `RUN_FINISHED` | | Done |
| `RUN_ERROR` | `message` | Friendly text to show |

### Tool `show_places` (frontend-rendered)

```json
{
  "places": [
    {
      "name": "Reverberate Cafe",
      "area": "Jibhi",
      "why": "Open late, known for trout",
      "kind": "meal",
      "lat": 31.59, "lng": 77.35,
      "suggested_day": "2026-11-14",
      "suggested_time": "20:00",
      "source_url": "https://…"
    }
  ]
}
```

`name` is required; everything else is optional. `kind` is one of the stop kinds (`meal`, `do`, `hike`, `stay`, `drive`, `meet`). The client geocodes with Photon when `lat`/`lng` are missing. The model never writes to the database.

## Errors

| Status | When | Client shows |
|---|---|---|
| 401 | Missing or invalid JWT | "Please sign in again." |
| 403 | Not a member of `trip_id` | "You're not on this trip." |
| 429 | More than 30 requests in an hour | "That's a lot of questions. Try again in a bit." |
| 503 | `OPENROUTER_API_KEY` not set, or upstream failed | "The AI helper isn't available right now." |

## Secrets (Supabase → Edge Functions → Secrets)

- `OPENROUTER_API_KEY` (required): set by the project owner, never committed or pasted in chat.
- `AI_MODEL` (optional): OpenRouter model id; a sensible default is set in code.

## Privacy

No request or response bodies are logged. OpenRouter is called with data-retention options off where the API offers them. The function is deployed with JWT verification on.
