# 5. Testing

Two automated suites plus manual UI verification. Reproduce with:
```bash
npm run test:db     # schema, constraints, trigger, procedures, overbooking (no server needed)
npm run dev         # in one terminal
npm run test:api    # end-to-end workflow against the running server
```

**Result (last run): `test:db` → 23 passed / 0 failed · `test:api` → 22 passed / 0 failed. Total 45 / 45.**

## 5.1 Database tests (`scripts/test-db.mjs`)
| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | All 9 tables exist | present | ✅ |
| 2 | Views `available_pickup_slots`, `order_summary` exist | present | ✅ |
| 3 | Procedures `get_available_pickup_slots`, `get_daily_canteen_sales` exist | present | ✅ |
| 4 | Trigger `trg_orders_status_audit` exists | present | ✅ |
| 5 | Index `idx_orders_status` exists | present | ✅ |
| 6 | Insert negative inventory | rejected (CHECK) | ✅ |
| 7 | Insert negative price | rejected (CHECK) | ✅ |
| 8 | Status change writes audit row | 1 audit row | ✅ |
| 9 | `booked_count` past capacity | rejected (CHECK) | ✅ |
| 10 | Stored procedures return result sets | rows returned | ✅ |
| 11 | View query + GROUP BY/HAVING | rows returned | ✅ |

## 5.2 End-to-end workflow tests (`scripts/test-api.mjs`)
| # | Test | Expected | Actual |
|---|---|---|---|
| 1 | Student login | 200, role STUDENT | ✅ |
| 2 | Vendor login | 200, role VENDOR | ✅ |
| 3 | Wrong password | 401 | ✅ |
| 4 | Student hits vendor API | 403 | ✅ |
| 5 | Pickup slot available | slot returned | ✅ |
| 6 | Place order | 201 | ✅ |
| 7 | Order total (2×60 + 1×45) | ₹165 | ✅ |
| 8 | Inventory deducted (food 1 −2, food 2 −1) | correct | ✅ |
| 9 | Slot `booked_count` +1 | correct | ✅ |
| 10 | MongoDB logs ORDER_PLACED | 1 document | ✅ |
| 11 | Over-ordering beyond stock | 409 | ✅ |
| 12 | Vendor advances PREPARING/READY/COLLECTED | 200 each | ✅ |
| 13 | Invalid transition COLLECTED→PREPARING | 409 | ✅ |
| 14 | Trigger logs 3 status changes | 3 audit rows | ✅ |
| 15 | Cancel order | 200 | ✅ |
| 16 | Inventory restored on cancel | +qty | ✅ |
| 17 | Slot capacity released on cancel | −1 | ✅ |
| 18 | Double cancel | 409 | ✅ |
| 19 | Final status is CANCELLED | CANCELLED | ✅ |

## 5.3 Concurrency note
Order placement locks the slot and inventory rows with `SELECT ... FOR UPDATE`, so two
students racing for the last unit/seat serialize: one commits, the other re-reads the
locked rows and is rejected (409). The `CHECK (booked_count ≤ capacity)` and
`CHECK (quantity_available ≥ 0)` constraints are the final backstop even if application
logic were bypassed.

## 5.4 Manual UI verification
Verified in-browser (see `screenshots/`): registration/login, browse+search, cart,
slot selection, placing an order (inventory/slot updated live on the vendor side),
status tracking, cancellation, vendor dashboard (live sales + MongoDB average rating),
menu/stock editing, and feedback analytics.
