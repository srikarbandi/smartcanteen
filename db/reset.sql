-- ============================================================================
-- SmartCanteen — controlled reset (DDL: DROP).
--
-- Safely demonstrates DROP of every object in dependency-safe order. Running
-- this then db/schema.sql + db/seed.sql returns the database to a clean state.
-- This is the "controlled reset script" referenced in the project docs; it is
-- intentionally destructive, so it is kept separate from schema.sql.
-- ============================================================================
USE smartcanteen;

-- Drop dependent objects first.
DROP TRIGGER   IF EXISTS trg_orders_status_audit;
DROP PROCEDURE IF EXISTS get_available_pickup_slots;
DROP PROCEDURE IF EXISTS get_daily_canteen_sales;
DROP VIEW      IF EXISTS order_summary;
DROP VIEW      IF EXISTS available_pickup_slots;

-- Drop tables children -> parents (FK-safe order).
DROP TABLE IF EXISTS order_status_audit;
DROP TABLE IF EXISTS order_item;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS pickup_slot;
DROP TABLE IF EXISTS food_item;
DROP TABLE IF EXISTS user_phone;
DROP TABLE IF EXISTS canteen;
DROP TABLE IF EXISTS users;

SELECT 'SmartCanteen objects dropped. Re-run schema.sql + seed.sql to rebuild.' AS status;
