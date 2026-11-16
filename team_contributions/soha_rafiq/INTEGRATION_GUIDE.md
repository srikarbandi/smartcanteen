# Integration Guide (Soha)

## Already present in the main project
All of Soha's files are **already integrated and working** in the shared codebase. This
package mirrors them so her authorship is clear and she can push them herself. If pushing
to a repo that already has them, there is nothing to change functionally — her task is to
ensure her commits land under her GitHub account (a `soha-contributions` branch + PR).

## Files to review (hers)
See `SOHA_CONTRIBUTION_MANIFEST.md`. In short: `db/mongo-init.mjs`, `src/lib/mongo.ts`,
`src/lib/auth.ts`, `src/lib/validation.ts`, `src/lib/http.ts`, `src/app/api/auth/*`,
`src/app/api/feedback/*`, `src/app/api/vendor/*`, `src/app/vendor/*`, `src/components/NavBar.tsx`.

## Files she must NOT modify (Sreekar's / shared)
`db/*.sql`, `src/lib/mysql.ts`, `src/lib/orders.ts`, `src/lib/data.ts`,
`src/lib/client.ts`, `src/lib/format.ts`, `src/components/ui.tsx`, `src/app/student/*`,
`scripts/*`. Her code imports these — leave them as-is.

## Dependencies that already exist
- npm packages: `mongodb`, `bcryptjs`, `zod`, `mysql2`, `next`, `react` (already in `package.json`).
- Shared helpers: `withTransaction` (mysql.ts), read helpers (data.ts), `updateOrderStatus`/`cancelOrder` (orders.ts).

## Environment variables she needs (`.env.local`)
```
MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
MYSQL_ADMIN_USER, MYSQL_ADMIN_PASSWORD   # for db:setup only
MONGODB_URI, MONGODB_DB
SESSION_SECRET, SESSION_MAX_AGE
```
Copy `.env.example` → `.env.local` and fill in. MongoDB defaults to `mongodb://127.0.0.1:27017`.

## How her changes connect to Sreekar's
- Her **auth** (`auth.ts`) protects every route, including Sreekar's student/order APIs.
- Her **vendor status** endpoint calls Sreekar's `updateOrderStatus()` (a transaction that fires the audit trigger).
- Her **feedback** write (Mongo) is read back by her vendor analytics (Mongo aggregation); the order it rates lives in Sreekar's MySQL tables.
- Her **vendor dashboard** reads Sreekar's `data.ts` helpers (SQL) plus her Mongo aggregation.

## Avoiding merge conflicts
- Work on branch `soha-contributions`; stage only her files (above).
- Pull/rebase on the main branch before opening the PR.
- Because ownership is split by file, conflicts should be rare — they can only occur in truly shared files (`layout.tsx`, `ui.tsx`), which she should not need to edit.
