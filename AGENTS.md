# Project rules

- Hispajuris portal export lives at `POST /api/public/hispajuris-export` (server route) with pure logic in `src/lib/hispajurisExport.core.ts` — new Edge Functions are not allowed; the core is testable without DB/secrets.
- Export output is built field-by-field from a whitelist; case refs are HMAC-derived and never the real id — no personal data may leave via the portal bridge.
