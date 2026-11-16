# Soha Rafiq — Contribution Manifest

**Project:** SmartCanteen — Campus Meal Pre-Ordering and Pickup Management System
**Member:** Soha Rafiq · PES1UG24AM278
**Team:** with Sreekar Bandi (PES1UG24AM282)

These are the files Soha owns or substantially contributed to, with their original
project paths preserved under `files/`. They are the **same** files that are integrated
and working in the main application — this is a handover package, not a separate copy of
the app.

## Files

| File (original path) | What it does | Feature | DB contribution | App contribution |
|---|---|---|---|---|
| `db/mongo-init.mjs` | Creates Mongo collections, validators, indexes; seeds demo feedback; runs the analytics aggregation | MongoDB setup | **NoSQL schema, indexes, aggregation** | `npm run mongo:setup` |
| `src/lib/mongo.ts` | Mongo client, typed `activity_logs`/`feedback` collections, `logActivity()` | MongoDB access | collection access + append | activity logging + feedback reads |
| `src/lib/auth.ts` | bcrypt hashing, signed HTTP-only session cookie, `requireUser`/`requireRole` | Auth & authz | — | sessions + RBAC for all routes |
| `src/lib/validation.ts` | zod schemas for every request body | Validation layer | enforces valid data before DB | backend validation |
| `src/lib/http.ts` | `ok`/`fail`/`handleError` response helpers (shared) | API plumbing | maps DB errors to HTTP | consistent JSON responses |
| `src/app/api/auth/*` | register, login, logout, me | Authentication | inserts users, reads for login | auth endpoints |
| `src/app/api/feedback/route.ts` | Submit a rating for a collected order | Feedback | **writes to Mongo `feedback`** | student feedback endpoint |
| `src/app/api/vendor/dashboard/route.ts` | Vendor daily stats + low stock + avg rating | Vendor dashboard | SQL aggregates + **Mongo aggregation** | dashboard data |
| `src/app/api/vendor/canteens/route.ts` | Vendor's own canteens | Vendor | SQL read | add-item form source |
| `src/app/api/vendor/food/route.ts` + `food/[id]/route.ts` | List/add/edit/delete food (+ inventory row) | Menu mgmt | SQL DML + ownership checks | vendor menu endpoints |
| `src/app/api/vendor/inventory/[foodId]/route.ts` | Set stock level | Inventory mgmt | SQL update + CHECK | inventory endpoint |
| `src/app/api/vendor/orders/route.ts` + `orders/[id]/status/route.ts` | List orders; advance status | Order mgmt | SQL + trigger audit | vendor order endpoints |
| `src/app/api/vendor/feedback/route.ts` | Feedback analytics + comments | Analytics | **Mongo aggregation pipeline** | analytics endpoint |
| `src/app/vendor/*` (layout, dashboard, menu, orders, feedback) | Vendor UI pages | Vendor interface | — | full vendor dashboard & management |
| `src/components/NavBar.tsx` | Shared top navigation + logout | UI | — | navigation |

## Dependencies on Sreekar's modules
- `src/lib/mysql.ts` (pool + `withTransaction`) — used by auth/vendor routes.
- `src/lib/data.ts` — vendor pages/endpoints call its read helpers (`getVendorDashboard`, `getVendorFood`, `getVendorOrders`, `getVendorFeedbackAnalytics`, …).
- `src/lib/orders.ts` — `updateOrderStatus()` (vendor status route) and `cancelOrder()`.
- `src/components/ui.tsx`, `src/lib/client.ts`, `src/lib/format.ts` — shared UI/format helpers.

These already exist in the shared repo; Soha's files import them and must **not** overwrite them.

## How to test Soha's modules
```bash
npm run mongo:setup     # exercises mongo-init.mjs (collections, indexes, aggregation)
npm run dev
npm run test:api        # covers auth, RBAC, vendor status transitions, feedback logging
```
Then in the UI: log in as `vendor1@smartcanteen.test` / `Smart@123` and use Dashboard,
Orders, Menu & stock and Feedback.
