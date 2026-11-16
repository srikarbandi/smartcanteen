# 7. Demonstration & Viva

## 7.1 Five-minute demo script
1. **(0:00) Problem & architecture (Sreekar)** — lunch-queue problem; MySQL (source of
   truth) + MongoDB (logs/feedback); show the ER diagram.
2. **(1:00) Student flow (Sreekar)** — log in as `student1`; browse/search menu; add
   items; pick a slot; place order. Show the order tracker.
3. **(2:00) The transaction (Sreekar)** — note how placing the order deducted inventory
   and reserved the slot; try to over-order → rejected (409). Open `src/lib/orders.ts`,
   point at `SELECT ... FOR UPDATE`.
4. **(3:00) Vendor flow (Soha)** — log in as `vendor1`; dashboard shows the new order,
   today's sales, low-stock, and the **MongoDB** average rating; advance the order
   PREPARING→READY→COLLECTED.
5. **(4:00) Advanced DB evidence (Soha)** — run `npm run test:db` (constraints, trigger,
   procedures, overbooking) and show `db/queries.sql` EXPLAIN output + the feedback
   aggregation on the Feedback page.
6. **(4:45) Wrap (both)** — Level 3 checklist: every requirement met.

## 7.2 Who explains what
- **Sreekar:** relational design, normalization, transactions/locking, procedures/triggers/views, indexing, student workflow.
- **Soha:** MongoDB model + aggregation, activity logging, authentication/authorization, vendor workflow, validation layers.

## 7.3 Likely viva questions & answers
**Q: Why both MySQL and MongoDB?**
MySQL for correctness-critical, strongly-related, transactional data (orders, inventory,
capacity, money) needing ACID + constraints. MongoDB for append-heavy logs and flexible
feedback with analytics via aggregation. Clear boundary, no duplication, no distributed txns.

**Q: How do you prevent overbooking / overselling under concurrency?**
Order placement runs in one transaction and takes row locks (`SELECT ... FOR UPDATE`) on
the slot and inventory before mutating. Final backstops are `CHECK (booked_count ≤ capacity)`
and `CHECK (quantity_available ≥ 0)` — the DB rejects a violation even if app logic failed.

**Q: What does the trigger do?**
`trg_orders_status_audit` fires `AFTER UPDATE ON orders`; when status changes it writes
an immutable row to `order_status_audit` — an automatic, tamper-evident history.

**Q: Show 3NF.** Atomic columns; phones in `user_phone` (1NF); no partial deps (2NF); no
transitive deps (3NF). `order_item.unit_price` is a deliberate price-at-purchase snapshot,
not redundancy; `orders.canteen_id` is a controlled denormalization kept consistent in the
placement transaction.

**Q: How are passwords/credentials secured?**
bcrypt-hashed passwords; signed HTTP-only session cookie; parameterized SQL; all secrets in
`.env.local` (git-ignored) — never hard-coded.

**Q: What are the stored procedures / views used for?**
`get_available_pickup_slots` feeds the ordering page; `get_daily_canteen_sales` feeds the
dashboard. `available_pickup_slots` exposes remaining capacity; `order_summary` reconciles
order totals.

**Q: Why is there no vector database?**
The data is structured and transactional, not unstructured/semantic. Under the SQL+NoSQL
option, vector search is optional — correctly marked Not Applicable.

## 7.4 Conclusion
SmartCanteen delivers a complete, well-engineered Level 3 project: a normalized relational
core with transactions, concurrency control, procedures, triggers, views and indexing;
a genuinely integrated MongoDB layer with an aggregation pipeline; a polished two-role
Next.js application; and full documentation + automated tests (45/45 passing).

## 7.5 Future enhancements
- Real-time order status via WebSockets/SSE.
- Student notifications when an order is READY.
- Vendor sales charts over a date range.
- Payment gateway integration (test mode).
- Per-item ratings and a semantic "search dishes by description" feature (a natural place to add a vector DB later).
