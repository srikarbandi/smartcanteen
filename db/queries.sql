-- ============================================================================
-- SmartCanteen — demonstration queries (DML + analytics).
-- Shows INNER/LEFT JOIN, GROUP BY, HAVING, ORDER BY, COUNT/SUM/AVG/MIN/MAX,
-- subqueries, views, stored procedures, the trigger, and EXPLAIN for indexes.
-- Safe to run after schema.sql + seed.sql (+ a few app-created orders).
-- ============================================================================
USE smartcanteen;

-- 1. SELECT with WHERE + ORDER BY (menu for a canteen) --------------------------
SELECT food_id, food_name, category, price, is_available
FROM food_item
WHERE canteen_id = 1
ORDER BY category, food_name;

-- 2. INNER JOIN: every food item with its canteen and live stock ---------------
SELECT f.food_id, f.food_name, c.canteen_name, f.price, i.quantity_available
FROM food_item f
INNER JOIN canteen   c ON f.canteen_id = c.canteen_id
INNER JOIN inventory i ON f.food_id    = i.food_id
ORDER BY c.canteen_name, f.food_name;

-- 3. LEFT JOIN + GROUP BY + aggregate: orders per student (incl. zero) ----------
SELECT u.user_id, u.name,
       COUNT(o.order_id)                 AS total_orders,
       COALESCE(SUM(o.total_amount), 0)  AS lifetime_spend
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id AND o.status <> 'CANCELLED'
WHERE u.role = 'STUDENT'
GROUP BY u.user_id, u.name
ORDER BY lifetime_spend DESC;

-- 4. GROUP BY + HAVING: canteens with more than 3 available items --------------
SELECT c.canteen_id, c.canteen_name, COUNT(f.food_id) AS available_items
FROM canteen c
JOIN food_item f ON c.canteen_id = f.canteen_id AND f.is_available = TRUE
GROUP BY c.canteen_id, c.canteen_name
HAVING COUNT(f.food_id) > 3
ORDER BY available_items DESC;

-- 5. Aggregates COUNT/SUM/AVG/MIN/MAX per category -----------------------------
SELECT category,
       COUNT(*)      AS items,
       MIN(price)    AS cheapest,
       MAX(price)    AS priciest,
       ROUND(AVG(price), 2) AS avg_price,
       SUM(price)    AS price_sum
FROM food_item
GROUP BY category
ORDER BY avg_price DESC;

-- 6. Subquery (non-correlated): items priced above the overall average ---------
SELECT food_name, price
FROM food_item
WHERE price > (SELECT AVG(price) FROM food_item)
ORDER BY price DESC;

-- 7. Correlated subquery: items priced above their own canteen's average -------
SELECT f.food_name, f.price, f.canteen_id
FROM food_item f
WHERE f.price > (
  SELECT AVG(f2.price) FROM food_item f2 WHERE f2.canteen_id = f.canteen_id
)
ORDER BY f.canteen_id, f.price DESC;

-- 8. Subquery in FROM: low-stock items (below 25 units) ------------------------
SELECT t.food_name, t.quantity_available
FROM (
  SELECT f.food_name, i.quantity_available
  FROM inventory i JOIN food_item f ON i.food_id = f.food_id
) AS t
WHERE t.quantity_available < 25
ORDER BY t.quantity_available ASC;

-- 9. View usage: remaining capacity today --------------------------------------
SELECT * FROM available_pickup_slots
WHERE slot_date = CURDATE() AND available_count > 0
ORDER BY canteen_id, start_time;

-- 10. View usage: order summary ------------------------------------------------
SELECT * FROM order_summary ORDER BY order_date DESC LIMIT 20;

-- 11. Stored procedure calls ---------------------------------------------------
CALL get_available_pickup_slots(1, CURDATE());
CALL get_daily_canteen_sales(1, CURDATE());

-- 12. Trigger evidence: status-change audit trail ------------------------------
SELECT a.audit_id, a.order_id, a.old_status, a.new_status, a.changed_at
FROM order_status_audit a
ORDER BY a.changed_at DESC
LIMIT 20;

-- 13. Best-selling items (JOIN + GROUP BY + ORDER BY + LIMIT) ------------------
SELECT f.food_name,
       SUM(oi.quantity)                      AS units_sold,
       SUM(oi.quantity * oi.unit_price)      AS revenue
FROM order_item oi
JOIN orders o   ON oi.order_id = o.order_id AND o.status <> 'CANCELLED'
JOIN food_item f ON oi.food_id = f.food_id
GROUP BY f.food_id, f.food_name
ORDER BY units_sold DESC
LIMIT 5;

-- ============================================================================
-- EXPLAIN: evidence that indexes are used (Advanced concept: Indexing)
-- ============================================================================
-- Uses idx_orders_status
EXPLAIN SELECT * FROM orders WHERE status = 'PLACED';
-- Uses idx_food_category
EXPLAIN SELECT * FROM food_item WHERE category = 'Beverage';
-- Uses idx_slot_canteen_date (composite)
EXPLAIN SELECT * FROM pickup_slot WHERE canteen_id = 1 AND slot_date = CURDATE();
-- Uses the UNIQUE index on users.email
EXPLAIN SELECT * FROM users WHERE email = 'student1@smartcanteen.test';
