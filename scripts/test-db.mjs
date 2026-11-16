// ============================================================================
// Automated database tests (mysql2, connects as the app user).
// Verifies schema objects, constraints, the trigger, stored procedures and
// overbooking/stock guards. Mutating tests run inside a transaction that is
// rolled back, so the seed data is left untouched.
//
//   npm run test:db
// ============================================================================
import mysql from "mysql2/promise";
import { cfg } from "./_env.mjs";

const c = cfg();
let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { console.log(`  ✅ ${name}`); pass++; }
  else { console.log(`  ❌ ${name} ${detail}`); fail++; }
}

const conn = await mysql.createConnection({
  host: c.host, port: Number(c.port), user: c.appUser,
  password: c.appPass, database: c.db, multipleStatements: false,
});

console.log("\n=== Schema objects ===");
{
  const [t] = await conn.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema=?`, [c.db]);
  const names = t.map((r) => r.TABLE_NAME || r.table_name);
  for (const want of ["users","user_phone","canteen","food_item","pickup_slot","orders","order_item","inventory","order_status_audit"])
    check(`table ${want}`, names.includes(want));
  const [v] = await conn.query(
    `SELECT table_name FROM information_schema.views WHERE table_schema=?`, [c.db]);
  const views = v.map((r) => r.TABLE_NAME || r.table_name);
  check("view available_pickup_slots", views.includes("available_pickup_slots"));
  check("view order_summary", views.includes("order_summary"));
  const [p] = await conn.query(
    `SELECT routine_name FROM information_schema.routines WHERE routine_schema=? AND routine_type='PROCEDURE'`, [c.db]);
  const procs = p.map((r) => r.ROUTINE_NAME || r.routine_name);
  check("procedure get_available_pickup_slots", procs.includes("get_available_pickup_slots"));
  check("procedure get_daily_canteen_sales", procs.includes("get_daily_canteen_sales"));
  const [tr] = await conn.query(
    `SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema=?`, [c.db]);
  check("trigger trg_orders_status_audit",
    tr.map((r) => r.TRIGGER_NAME || r.trigger_name).includes("trg_orders_status_audit"));
  const [idx] = await conn.query(`SHOW INDEX FROM orders`);
  check("index idx_orders_status exists", idx.some((r) => r.Key_name === "idx_orders_status"));
}

console.log("\n=== CHECK constraints ===");
{
  try { await conn.query(`INSERT INTO inventory (food_id, quantity_available) VALUES (1, -5)`); check("negative inventory rejected", false, "(insert unexpectedly succeeded)"); }
  catch (e) { check("negative inventory rejected", /check|constraint|duplicate/i.test(e.message), e.code); }

  try { await conn.query(`INSERT INTO food_item (canteen_id, food_name, category, price) VALUES (1,'X','Y',-1)`); check("negative price rejected", false); }
  catch (e) { check("negative price rejected", /check|constraint/i.test(e.message), e.code); }
}

console.log("\n=== Trigger + status transition (rolled back) ===");
{
  await conn.beginTransaction();
  try {
    // Use an existing seeded slot + food to build a throwaway order.
    const [[slot]] = await conn.query(`SELECT slot_id, canteen_id FROM pickup_slot LIMIT 1`);
    const [res] = await conn.query(
      `INSERT INTO orders (user_id, slot_id, canteen_id, status, total_amount) VALUES (3, ?, ?, 'PLACED', 10.00)`,
      [slot.slot_id, slot.canteen_id]);
    const orderId = res.insertId;
    await conn.query(`UPDATE orders SET status='PREPARING' WHERE order_id=?`, [orderId]);
    const [[audit]] = await conn.query(
      `SELECT COUNT(*) AS c FROM order_status_audit WHERE order_id=? AND new_status='PREPARING'`, [orderId]);
    check("trigger wrote audit row on status change", audit.c === 1);
  } finally {
    await conn.rollback(); // leave seed data clean
  }
}

console.log("\n=== Overbooking guard (rolled back) ===");
{
  await conn.beginTransaction();
  try {
    const [[slot]] = await conn.query(`SELECT slot_id, capacity FROM pickup_slot LIMIT 1`);
    await conn.query(`UPDATE pickup_slot SET booked_count=capacity WHERE slot_id=?`, [slot.slot_id]);
    try {
      await conn.query(`UPDATE pickup_slot SET booked_count=booked_count+1 WHERE slot_id=?`, [slot.slot_id]);
      check("overbooking beyond capacity rejected", false, "(update unexpectedly succeeded)");
    } catch (e) {
      check("overbooking beyond capacity rejected", /check|constraint/i.test(e.message), e.code);
    }
  } finally {
    await conn.rollback();
  }
}

console.log("\n=== Stored procedures ===");
{
  const [sp1] = await conn.query(`CALL get_available_pickup_slots(1, CURDATE())`);
  check("get_available_pickup_slots returns a result set", Array.isArray(sp1[0]));
  const [sp2] = await conn.query(`CALL get_daily_canteen_sales(1, CURDATE())`);
  check("get_daily_canteen_sales returns a row", Array.isArray(sp2[0]) && sp2[0].length === 1);
}

console.log("\n=== Views + aggregates ===");
{
  const [aps] = await conn.query(`SELECT * FROM available_pickup_slots LIMIT 1`);
  check("available_pickup_slots view queryable", Array.isArray(aps));
  const [agg] = await conn.query(
    `SELECT category, COUNT(*) n, AVG(price) a FROM food_item GROUP BY category HAVING COUNT(*) >= 1`);
  check("GROUP BY/HAVING aggregate runs", agg.length > 0);
}

await conn.end();
console.log(`\n================  ${pass} passed, ${fail} failed  ================`);
process.exit(fail ? 1 : 0);
