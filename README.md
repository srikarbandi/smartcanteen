# SmartCanteen 🍃

**Campus Meal Pre-Ordering and Pickup Management System**
DBMS Experiential Learning — Level 3 Mini Project · PES University

Students pre-order meals and reserve a pickup slot to skip the lunch-hour queue;
vendors manage menus, inventory and orders. Built on **MySQL** (authoritative,
transactional) + **MongoDB** (activity logs & feedback analytics) with a
**Next.js** full-stack interface.

| | |
|---|---|
| **Team** | Sreekar Bandi (PES1UG24AM282) · Soha Rafiq (PES1UG24AM278) |
| **Stack** | Next.js 14 (App Router, TypeScript) · Tailwind CSS · MySQL 8+ · MongoDB · bcrypt |
| **Roles** | Student · Vendor |

---

## Features

**Student:** register/login · browse & search menu · cart · select pickup slot ·
place order (one DB transaction) · track status · order history · cancel eligible orders · rate collected orders.

**Vendor:** login · dashboard (today's orders/sales, pending, low-stock, avg rating) ·
add/edit food · manage inventory · view incoming orders · advance status (Placed → Preparing → Ready → Collected) · feedback analytics.

## Advanced DBMS concepts demonstrated (6)
1. **Transactions + concurrency** — order placement & cancellation with `SELECT … FOR UPDATE` row-locking (`src/lib/orders.ts`).
2. **Stored procedures** — `get_available_pickup_slots`, `get_daily_canteen_sales`.
3. **Trigger** — `trg_orders_status_audit` (AFTER UPDATE on `orders`).
4. **Views** — `available_pickup_slots`, `order_summary`.
5. **Indexing** — 9 indexes + `EXPLAIN` evidence (`db/queries.sql`).
6. **MongoDB aggregation** — per-canteen feedback analytics pipeline.

See [`docs/`](docs/) for full design, and [`docs/LEVEL3_REQUIREMENTS_CHECKLIST.md`](docs/LEVEL3_REQUIREMENTS_CHECKLIST.md) for the guideline-by-guideline audit.

---

## Prerequisites
- **Node.js** 18.17+ (tested on 26.x) and npm
- **MySQL** 8.0+ running locally
- **MongoDB** running locally (`brew services start mongodb-community`)

## Setup

```bash
# 1. Install dependencies
npm install
```
```bash
# 2. Configure environment
cp .env.example .env.local
# then edit .env.local — set MYSQL_ADMIN_PASSWORD to your MySQL root password
```
```bash
# 3. Create database + app user, load schema, procedures, trigger, views, seed data
npm run db:setup
```
```bash
# 4. Initialize MongoDB collections, indexes and demo feedback
npm run mongo:setup
```
```bash
# 5. Run the app
npm run dev
```
Open http://localhost:3000.

### Demo accounts (password `Smart@123`)
| Role | Email |
|---|---|
| Student | `student1@smartcanteen.test` |
| Vendor | `vendor1@smartcanteen.test` |

## Useful scripts
| Command | Does |
|---|---|
| `npm run db:setup` | Create DB + app user, load schema + seed |
| `npm run db:reset` | Drop everything, reload schema + seed |
| `npm run mongo:setup` | Create Mongo collections/indexes + demo data + print aggregation |
| `npm run test:db` | Automated DB tests (constraints, trigger, procedures, overbooking) |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (type-checks everything) |

## Project structure
```
db/            schema.sql, seed.sql, reset.sql, queries.sql, mongo-init.mjs
scripts/       db-setup / db-reset / test-db
src/lib/       mysql, mongo, auth, validation, orders (transactions), data
src/app/       api/ (route handlers) + student/ + vendor/ pages
docs/          design, advanced features, testing, Level 3 checklist, viva
team_contributions/soha_rafiq/   Soha's handover package
```

## Security notes
- Passwords hashed with bcrypt; sessions are signed, HTTP-only cookies.
- All SQL uses parameterized queries. Credentials come from env vars only; `.env.local` is git-ignored.

---
*DBMS Level 3 · SmartCanteen · 2025.*
