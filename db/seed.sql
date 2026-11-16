-- ============================================================================
-- SmartCanteen — sample data (DML: INSERT).
--
-- NOTE ON PASSWORDS: the password_hash values below are bcrypt hashes of the
-- demo password "Smart@123". The AUTHORITATIVE, always-correct seeding path is
-- `npm run db:setup`, which hashes passwords in Node at insert time. This file
-- mirrors that data for the SQL submission. If a hash here ever drifts, re-run
-- the setup script. (All demo accounts share the password Smart@123.)
--
-- Run after db/schema.sql.
-- ============================================================================
USE smartcanteen;

-- Keep this script idempotent for demos: clear data (children first), then
-- reset AUTO_INCREMENT so ids are stable across reseeds.
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE order_status_audit;
TRUNCATE TABLE order_item;
TRUNCATE TABLE orders;
TRUNCATE TABLE inventory;
TRUNCATE TABLE pickup_slot;
TRUNCATE TABLE food_item;
TRUNCATE TABLE user_phone;
TRUNCATE TABLE canteen;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---- Users (password = "Smart@123") ---------------------------------------
INSERT INTO users (user_id, name, email, password_hash, role) VALUES
  (1, 'Anita Rao',     'vendor1@smartcanteen.test', '$2a$10$DohO/10a4AIUGN0yPfQ6bulmvBS3hofnOXPT/AzDGOGcFmswgItU2', 'VENDOR'),
  (2, 'Vikram Shetty', 'vendor2@smartcanteen.test', '$2a$10$DohO/10a4AIUGN0yPfQ6bulmvBS3hofnOXPT/AzDGOGcFmswgItU2', 'VENDOR'),
  (3, 'Sreekar Bandi', 'student1@smartcanteen.test','$2a$10$DohO/10a4AIUGN0yPfQ6bulmvBS3hofnOXPT/AzDGOGcFmswgItU2', 'STUDENT'),
  (4, 'Soha Rafiq',    'student2@smartcanteen.test','$2a$10$DohO/10a4AIUGN0yPfQ6bulmvBS3hofnOXPT/AzDGOGcFmswgItU2', 'STUDENT'),
  (5, 'Priya Menon',   'student3@smartcanteen.test','$2a$10$DohO/10a4AIUGN0yPfQ6bulmvBS3hofnOXPT/AzDGOGcFmswgItU2', 'STUDENT');

INSERT INTO user_phone (user_id, phone_number) VALUES
  (1, '9880011111'),
  (2, '9880022222'),
  (3, '9880033333'),
  (3, '9880034444'),
  (4, '9880044444');

-- ---- Canteens (each managed by one vendor) --------------------------------
INSERT INTO canteen (canteen_id, canteen_name, location, description, operating_hours, vendor_id) VALUES
  (1, 'Main Block Canteen', 'Main Block, Ground Floor', 'South Indian, snacks and beverages.', '08:00 - 18:00', 1),
  (2, 'MRD Food Court',     'MRD Block, 1st Floor',    'North Indian, rolls and fast food.',   '09:00 - 19:00', 2);

-- ---- Food items -----------------------------------------------------------
INSERT INTO food_item (food_id, canteen_id, food_name, category, price, is_available, preparation_time, image_url) VALUES
  (1, 1, 'Masala Dosa',       'South Indian', 60.00, TRUE, 10, 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=640'),
  (2, 1, 'Idli Vada Combo',   'South Indian', 45.00, TRUE,  8, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=640'),
  (3, 1, 'Filter Coffee',     'Beverage',     20.00, TRUE,  3, 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=640'),
  (4, 1, 'Veg Puff',          'Snack',        25.00, TRUE,  2, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=640'),
  (5, 1, 'Pongal',            'South Indian', 50.00, TRUE,  9, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=640'),
  (6, 2, 'Paneer Roll',       'North Indian', 80.00, TRUE, 12, 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=640'),
  (7, 2, 'Chole Bhature',     'North Indian', 90.00, TRUE, 15, 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=640'),
  (8, 2, 'Veg Fried Rice',    'Chinese',      75.00, TRUE, 12, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=640'),
  (9, 2, 'Masala Chai',       'Beverage',     15.00, TRUE,  4, 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=640'),
  (10,2, 'Gulab Jamun (2pc)', 'Dessert',      40.00, TRUE,  2, 'https://images.unsplash.com/photo-1601303516534-bf0bbca9b7a1?w=640');

-- ---- Inventory (one row per food item) ------------------------------------
INSERT INTO inventory (food_id, quantity_available) VALUES
  (1, 40), (2, 35), (3, 100), (4, 50), (5, 30),
  (6, 25), (7, 20), (8, 30), (9, 100), (10, 60);

-- ---- Pickup slots for today and tomorrow ----------------------------------
-- Canteen 1 (Main Block)
INSERT INTO pickup_slot (canteen_id, slot_date, start_time, end_time, capacity, booked_count) VALUES
  (1, CURDATE(),              '12:00:00', '12:30:00', 20, 0),
  (1, CURDATE(),              '12:30:00', '13:00:00', 20, 0),
  (1, CURDATE(),              '13:00:00', '13:30:00', 20, 0),
  (1, CURDATE() + INTERVAL 1 DAY, '12:00:00', '12:30:00', 20, 0),
  (1, CURDATE() + INTERVAL 1 DAY, '12:30:00', '13:00:00', 20, 0);
-- Canteen 2 (MRD)
INSERT INTO pickup_slot (canteen_id, slot_date, start_time, end_time, capacity, booked_count) VALUES
  (2, CURDATE(),              '12:15:00', '12:45:00', 15, 0),
  (2, CURDATE(),              '12:45:00', '13:15:00', 15, 0),
  (2, CURDATE(),              '13:15:00', '13:45:00', 15, 0),
  (2, CURDATE() + INTERVAL 1 DAY, '12:15:00', '12:45:00', 15, 0),
  (2, CURDATE() + INTERVAL 1 DAY, '12:45:00', '13:15:00', 15, 0);

SELECT 'SmartCanteen sample data loaded.' AS status;
