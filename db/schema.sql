-- ============================================================================
-- SmartCanteen — MySQL schema (DDL, constraints, indexes, views, procedures,
--                 trigger).  MySQL 8.0+ / 9.x, InnoDB.
--
-- This EXTENDS the Lab 4 foundation schema. Lab 4 built: users, user_phone,
-- canteen, food_item, pickup_slot, orders, order_item, inventory, the
-- available_pickup_slots view, and two indexes. This file reproduces that
-- design and adds the columns that were present in the Lab 4 ER diagram but
-- not yet in the console DDL (food_item.preparation_time, food_item.image_url,
-- orders.special_instructions), plus the application extensions documented in
-- docs/02_database_design.md:
--   * canteen.vendor_id          -> ties a vendor to the canteen they manage
--   * orders.canteen_id          -> denormalised for fast per-vendor queries
--   * pickup_slot.booked_count   -> O(1), lockable capacity counter
--   * order_status_audit         -> target table of the AFTER UPDATE trigger
--
-- Run order: db/reset.sql (optional) -> db/schema.sql -> db/seed.sql
-- Advanced concepts demonstrated here: Views, Stored Procedures, Trigger,
-- Indexing, CHECK/FK constraints (transactions & concurrency live in the app
-- layer, see src/lib/orders.ts).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smartcanteen
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE smartcanteen;

-- ----------------------------------------------------------------------------
-- 1. USERS  (STUDENT / VENDOR / ADMIN).  Passwords stored as bcrypt hashes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       INT AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('STUDENT','VENDOR','ADMIN') NOT NULL DEFAULT 'STUDENT',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. USER_PHONE  (multivalued attribute -> separate table, keeps 1NF).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_phone (
  user_id      INT          NOT NULL,
  phone_number VARCHAR(20)  NOT NULL,
  PRIMARY KEY (user_id, phone_number),
  CONSTRAINT fk_user_phone_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. CANTEEN.  vendor_id links the VENDOR user who manages this canteen
--    (enables "a vendor may only edit their own canteen" authorization).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canteen (
  canteen_id      INT AUTO_INCREMENT,
  canteen_name    VARCHAR(150) NOT NULL,
  location        VARCHAR(150) NOT NULL,
  description     TEXT,
  operating_hours VARCHAR(100),
  vendor_id       INT NULL,
  PRIMARY KEY (canteen_id),
  CONSTRAINT fk_canteen_vendor
    FOREIGN KEY (vendor_id) REFERENCES users(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. FOOD_ITEM.  price >= 0 enforced at DB level.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_item (
  food_id          INT AUTO_INCREMENT,
  canteen_id       INT NOT NULL,
  food_name        VARCHAR(100)  NOT NULL,
  category         VARCHAR(50)   NOT NULL,
  price            DECIMAL(10,2) NOT NULL,
  is_available     BOOLEAN       NOT NULL DEFAULT TRUE,
  preparation_time INT           NULL,          -- minutes
  image_url        VARCHAR(500)  NULL,
  PRIMARY KEY (food_id),
  CONSTRAINT chk_food_price CHECK (price >= 0),
  CONSTRAINT chk_food_prep  CHECK (preparation_time IS NULL OR preparation_time >= 0),
  CONSTRAINT fk_food_canteen
    FOREIGN KEY (canteen_id) REFERENCES canteen(canteen_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. PICKUP_SLOT.  booked_count is maintained transactionally by the app and
--    may never exceed capacity (overbooking is impossible by construction).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pickup_slot (
  slot_id      INT AUTO_INCREMENT,
  canteen_id   INT  NOT NULL,
  slot_date    DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  capacity     INT  NOT NULL,
  booked_count INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (slot_id),
  CONSTRAINT chk_slot_capacity CHECK (capacity > 0),
  CONSTRAINT chk_slot_time     CHECK (end_time > start_time),
  CONSTRAINT chk_slot_booked   CHECK (booked_count >= 0 AND booked_count <= capacity),
  CONSTRAINT fk_slot_canteen
    FOREIGN KEY (canteen_id) REFERENCES canteen(canteen_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. ORDERS.  canteen_id denormalised from the slot for per-vendor queries.
--    FK to users/slot use RESTRICT so history is never silently destroyed.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  order_id             INT AUTO_INCREMENT,
  user_id              INT NOT NULL,
  slot_id              INT NOT NULL,
  canteen_id           INT NOT NULL,
  order_date           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status               ENUM('PLACED','PREPARING','READY','COLLECTED','CANCELLED')
                         NOT NULL DEFAULT 'PLACED',
  total_amount         DECIMAL(10,2) NOT NULL,
  payment_status       ENUM('PENDING','PAID','FAILED','REFUNDED')
                         NOT NULL DEFAULT 'PENDING',
  special_instructions VARCHAR(500) NULL,
  cancelled_at         DATETIME NULL,
  PRIMARY KEY (order_id),
  CONSTRAINT chk_order_total CHECK (total_amount >= 0),
  CONSTRAINT fk_order_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_order_slot
    FOREIGN KEY (slot_id) REFERENCES pickup_slot(slot_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_order_canteen
    FOREIGN KEY (canteen_id) REFERENCES canteen(canteen_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. ORDER_ITEM.  unit_price snapshots the price at order time (history-safe).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_item (
  order_item_id INT AUTO_INCREMENT,
  order_id      INT NOT NULL,
  food_id       INT NOT NULL,
  quantity      INT NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_item_id),
  CONSTRAINT chk_order_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_order_item_price    CHECK (unit_price >= 0),
  CONSTRAINT uq_order_food UNIQUE (order_id, food_id),   -- one line per food/order
  CONSTRAINT fk_order_item_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_item_food
    FOREIGN KEY (food_id) REFERENCES food_item(food_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. INVENTORY.  quantity_available >= 0 is the hard guarantee that protects
--    against negative stock even under concurrent orders.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id       INT AUTO_INCREMENT,
  food_id            INT NOT NULL UNIQUE,
  quantity_available INT NOT NULL DEFAULT 0,
  last_updated       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inventory_id),
  CONSTRAINT chk_inventory_quantity CHECK (quantity_available >= 0),
  CONSTRAINT fk_inventory_food
    FOREIGN KEY (food_id) REFERENCES food_item(food_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. ORDER_STATUS_AUDIT.  Append-only audit log written by the trigger below.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_audit (
  audit_id    INT AUTO_INCREMENT,
  order_id    INT NOT NULL,
  old_status  VARCHAR(20) NOT NULL,
  new_status  VARCHAR(20) NOT NULL,
  changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  CONSTRAINT fk_audit_order
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- INDEXES  (Advanced concept: Indexing).  Unique indexes on users.email and
-- inventory.food_id already exist implicitly from the UNIQUE constraints.
-- Use `EXPLAIN SELECT ...` (see db/queries.sql) to see these in query plans.
-- ============================================================================
CREATE INDEX idx_food_canteen       ON food_item(canteen_id);
CREATE INDEX idx_food_category       ON food_item(category);
CREATE INDEX idx_slot_canteen_date   ON pickup_slot(canteen_id, slot_date);
CREATE INDEX idx_slot_date           ON pickup_slot(slot_date);
CREATE INDEX idx_orders_user         ON orders(user_id);
CREATE INDEX idx_orders_canteen      ON orders(canteen_id);
CREATE INDEX idx_orders_status       ON orders(status);
CREATE INDEX idx_orders_date         ON orders(order_date);
CREATE INDEX idx_order_item_order    ON order_item(order_id);

-- ============================================================================
-- VIEWS  (Advanced concept: Views)
-- ============================================================================

-- 9a. available_pickup_slots — remaining capacity per slot (uses the
--     maintained booked_count counter; carries the Lab 4 view forward).
CREATE OR REPLACE VIEW available_pickup_slots AS
SELECT
  ps.slot_id,
  ps.canteen_id,
  c.canteen_name,
  ps.slot_date,
  ps.start_time,
  ps.end_time,
  ps.capacity,
  ps.booked_count,
  (ps.capacity - ps.booked_count) AS available_count
FROM pickup_slot ps
JOIN canteen c ON ps.canteen_id = c.canteen_id;

-- 9b. order_summary — one row per order with its canteen, student, item count
--     and verified item total (handy for dashboards and reconciliation).
CREATE OR REPLACE VIEW order_summary AS
SELECT
  o.order_id,
  o.user_id,
  u.name              AS student_name,
  o.canteen_id,
  c.canteen_name,
  o.order_date,
  o.status,
  o.payment_status,
  o.total_amount,
  COUNT(oi.order_item_id)                 AS line_items,
  COALESCE(SUM(oi.quantity), 0)           AS total_quantity,
  COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS computed_total
FROM orders o
JOIN users u    ON o.user_id = u.user_id
JOIN canteen c  ON o.canteen_id = c.canteen_id
LEFT JOIN order_item oi ON o.order_id = oi.order_id
GROUP BY o.order_id, o.user_id, u.name, o.canteen_id, c.canteen_name,
         o.order_date, o.status, o.payment_status, o.total_amount;

-- ============================================================================
-- STORED PROCEDURES  (Advanced concept: Stored procedures)
-- ============================================================================
DELIMITER $$

-- 10a. get_available_pickup_slots — bookable slots for a canteen on a date.
DROP PROCEDURE IF EXISTS get_available_pickup_slots $$
CREATE PROCEDURE get_available_pickup_slots(
  IN p_canteen_id INT,
  IN p_date       DATE
)
BEGIN
  SELECT
    slot_id, canteen_id, canteen_name, slot_date,
    start_time, end_time, capacity, booked_count, available_count
  FROM available_pickup_slots
  WHERE canteen_id = p_canteen_id
    AND slot_date  = p_date
    AND available_count > 0
  ORDER BY start_time;
END $$

-- 10b. get_daily_canteen_sales — revenue + order counts for a canteen/day,
--      excluding cancelled orders.  Demonstrates aggregates in a procedure.
DROP PROCEDURE IF EXISTS get_daily_canteen_sales $$
CREATE PROCEDURE get_daily_canteen_sales(
  IN p_canteen_id INT,
  IN p_date       DATE
)
BEGIN
  SELECT
    p_canteen_id                                  AS canteen_id,
    p_date                                        AS sales_date,
    COUNT(*)                                      AS total_orders,
    COALESCE(SUM(total_amount), 0)                AS gross_revenue,
    COALESCE(SUM(CASE WHEN status = 'COLLECTED'
                      THEN total_amount END), 0)  AS collected_revenue,
    COALESCE(AVG(total_amount), 0)                AS avg_order_value
  FROM orders
  WHERE canteen_id = p_canteen_id
    AND DATE(order_date) = p_date
    AND status <> 'CANCELLED';
END $$

DELIMITER ;

-- ============================================================================
-- TRIGGER  (Advanced concept: Triggers)
-- Records every genuine order status change into order_status_audit.
-- ============================================================================
DROP TRIGGER IF EXISTS trg_orders_status_audit;
DELIMITER $$
CREATE TRIGGER trg_orders_status_audit
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO order_status_audit (order_id, old_status, new_status)
    VALUES (NEW.order_id, OLD.status, NEW.status);
  END IF;
END $$
DELIMITER ;

-- ============================================================================
-- ALTER demonstration (DDL: ALTER).  Kept from Lab 4 — widens canteen_name and
-- is idempotent to re-run.
-- ============================================================================
ALTER TABLE canteen MODIFY canteen_name VARCHAR(150) NOT NULL;

-- Done.
SELECT 'SmartCanteen schema created.' AS status;
