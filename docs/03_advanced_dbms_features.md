# 3. Advanced DBMS Features

The project implements **six** advanced concepts. Each is the simplest technically
correct implementation that satisfies the requirement — no duplicated implementations.

| # | Concept | Where | How to demonstrate |
|---|---|---|---|
| 1 | Transactions + concurrency | `src/lib/orders.ts`, `src/lib/mysql.ts` | Place/cancel an order; run `npm run test:api` |
| 2 | Stored procedures | `db/schema.sql` | `CALL get_available_pickup_slots(1, CURDATE());` |
| 3 | Trigger | `db/schema.sql` | Update an order's status, then read `order_status_audit` |
| 4 | Views | `db/schema.sql` | `SELECT * FROM available_pickup_slots;` |
| 5 | Indexing | `db/schema.sql`, `db/queries.sql` | `EXPLAIN SELECT ...` queries |
| 6 | MongoDB aggregation | `db/mongo-init.mjs`, `src/lib/data.ts` | Vendor → Feedback page; `npm run mongo:setup` |

## 3.1 Transactions & Concurrency
`placeOrder()` runs inside a single transaction (`withTransaction`) and takes
row-level locks before mutating:
1. `SELECT ... FOR UPDATE` the pickup slot → reject if `booked_count ≥ capacity`.
2. `SELECT ... FOR UPDATE` each food + inventory row (ordered by `food_id` to avoid deadlocks) → reject if stock is insufficient.
3. Insert the order + items, deduct inventory, increment `booked_count`.
4. **Commit** — or **roll back everything** on any failure.

Guarantees: no negative inventory, no slot overbooking, no duplicate deductions, no
partial orders. `cancelOrder()` reverses this (restore stock, release slot) exactly
once, guarded by the status check inside the same locked transaction. Uses InnoDB.

## 3.2 Stored Procedures
- `get_available_pickup_slots(canteen_id, date)` — bookable slots (available_count > 0) for a canteen/day, ordered by time. Used by the order page.
- `get_daily_canteen_sales(canteen_id, date)` — order count, gross/collected revenue and average order value for a canteen/day (excludes cancelled).

## 3.3 Trigger
`trg_orders_status_audit` — `AFTER UPDATE ON orders`. When `NEW.status <> OLD.status`,
it inserts a row into `order_status_audit`. This gives a tamper-evident history of
every lifecycle change, written automatically by the database.

## 3.4 Views
- `available_pickup_slots` — slot + canteen + `capacity − booked_count AS available_count` (carried forward from Lab 4, now using the maintained counter).
- `order_summary` — one row per order with student, canteen, line-item count, total quantity and a verified `computed_total` (JOIN + GROUP BY).

## 3.5 Indexing (with EXPLAIN)
Indexes created: `idx_food_canteen`, `idx_food_category`, `idx_slot_canteen_date`
(composite), `idx_slot_date`, `idx_orders_user`, `idx_orders_canteen`,
`idx_orders_status`, `idx_orders_date`, `idx_order_item_order`, plus the UNIQUE
indexes on `users.email` and `inventory.food_id`. `db/queries.sql` includes `EXPLAIN`
statements showing these indexes in the query plans (e.g. `WHERE status='PLACED'` uses
`idx_orders_status`; `WHERE category='Beverage'` uses `idx_food_category`).

## 3.6 MongoDB Aggregation
Feedback analytics pipeline (per canteen):
```js
[ { $match: { canteen_id: { $in: ids } } },
  { $group: { _id: "$canteen_id", averageRating: { $avg: "$rating" }, feedbackCount: { $sum: 1 } } },
  { $project: { canteen_id: "$_id", averageRating: { $round: ["$averageRating", 2] }, feedbackCount: 1 } },
  { $sort: { averageRating: -1 } } ]
```
Demonstrates `$match`, `$group`, `$avg`, `$sum`, `$project`, `$round`, `$sort`. Powers
the vendor dashboard "average rating" and the Feedback page.

## 3.7 SQL coverage (DDL/DML and more)
- **DDL:** `CREATE` (tables/views/procedures/trigger/indexes), `ALTER` (widen `canteen_name`), `DROP` (`db/reset.sql`, a controlled reset).
- **DML:** `INSERT`/`UPDATE`/`DELETE`/`SELECT` across the API + seed.
- **Queries:** INNER/LEFT JOIN, GROUP BY, HAVING, ORDER BY, COUNT/SUM/AVG/MIN/MAX, scalar + correlated + derived-table subqueries — all in `db/queries.sql`.
