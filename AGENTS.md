# Project rules

- Hispajuris portal export lives at `POST /api/public/hispajuris-export` (server route) with pure logic in `src/lib/hispajurisExport.core.ts` — new Edge Functions are not allowed; the core is testable without DB/secrets.
- Export output is built field-by-field from a whitelist; case refs are HMAC-derived and never the real id — no personal data may leave via the portal bridge.
- Portal access endpoints (`/api/public/hispajuris-lawyers`, `/api/public/hispajuris-verify-credentials`) reuse the export HMAC; logic in `src/lib/hispajurisAccess.core.ts` — passwords are only checked via an isolated non-persistent sign-in, never stored or logged.
