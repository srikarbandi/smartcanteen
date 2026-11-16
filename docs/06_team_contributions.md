# 6. Team Contributions

One unified codebase, two members with genuine, distinct technical ownership. Both
understand the whole system; the split is a coordination mechanism, not a wall.

## 6.1 Contribution matrix
| Area | Sreekar Bandi (PES1UG24AM282) | Soha Rafiq (PES1UG24AM278) |
|---|---|---|
| MySQL schema & DDL | ✅ owns | reviews |
| Constraints / normalization | ✅ owns | reviews |
| Transactions & concurrency | ✅ owns | reviews |
| Stored procedures / triggers / views | ✅ owns | reviews |
| Indexing | ✅ owns | reviews |
| Student ordering / cart / checkout / cancel | ✅ owns | reviews |
| MongoDB design / collections / indexes | reviews | ✅ owns |
| Activity logging | reviews | ✅ owns |
| Feedback storage + aggregation analytics | reviews | ✅ owns |
| Authentication & authorization | reviews | ✅ owns |
| Vendor dashboard / menu / inventory / order mgmt | reviews | ✅ owns |
| Documentation / testing / integration | shared | shared |

## 6.2 File ownership (primary)
**Sreekar:**
`db/schema.sql`, `db/seed.sql`, `db/reset.sql`, `db/queries.sql`,
`src/lib/mysql.ts`, `src/lib/orders.ts`, `src/lib/data.ts` (read queries),
`src/app/api/orders/*`, `src/app/api/slots/*`, `src/app/api/menu/*`, `src/app/api/canteens/*`,
`src/app/student/*`, `scripts/db-setup.mjs`, `scripts/db-reset.mjs`, `scripts/test-db.mjs`.

**Soha:**
`db/mongo-init.mjs`, `src/lib/mongo.ts`, `src/lib/auth.ts`, `src/lib/validation.ts`,
`src/app/api/auth/*`, `src/app/api/feedback/*`, `src/app/api/vendor/*`,
`src/app/vendor/*`, `src/components/NavBar.tsx`.

**Shared:** `src/app/layout.tsx`, `src/components/ui.tsx`, `src/lib/http.ts`,
`src/lib/format.ts`, `docs/*`, `README.md`, test scripts (integration).

## 6.3 GitHub workflow
- Sreekar commits/pushes his modules + shared foundation using **his own** authenticated GitHub account.
- Soha integrates and pushes her modules using **her own** GitHub identity (see
  `team_contributions/soha_rafiq/` — her files, manifest, README and LLM push
  instructions). Contributions are never fabricated and identities are never impersonated.
