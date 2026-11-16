// ============================================================================
// End-to-end API / workflow tests against the running dev server.
// Exercises the real transactional paths and asserts DB side-effects.
//   1. Start the app:  npm run dev
//   2. In another tab: node scripts/test-api.mjs   (or npm run test:api)
// ============================================================================
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import { cfg } from "./_env.mjs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const c = cfg();
let pass = 0, fail = 0;
const ok = (n, cond, d = "") => { if (cond) { console.log(`  ✅ ${n}`); pass++; } else { console.log(`  ❌ ${n} ${d}`); fail++; } };

const db = await mysql.createConnection({ host: c.host, port: Number(c.port), user: c.appUser, password: c.appPass, database: c.db });
const mongo = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
await mongo.connect();
const logs = mongo.db(process.env.MONGODB_DB || "smartcanteen").collection("order_activity_logs");

const scalar = async (sql, p = []) => { const [r] = await db.query(sql, p); return r[0] ? Object.values(r[0])[0] : null; };

// --- cookie-aware fetch ---
async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  const json = await res.json();
  return { cookie, json, status: res.status };
}
async function call(path, cookie, method = "GET", body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "Content-Type": "application/json", cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const _d = new Date();
const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`;

console.log("\n=== Auth ===");
const student = await login("student1@smartcanteen.test", "Smart@123");
ok("student login succeeds", student.status === 200 && student.json.data.role === "STUDENT");
const vendor = await login("vendor1@smartcanteen.test", "Smart@123");
ok("vendor login succeeds", vendor.status === 200 && vendor.json.data.role === "VENDOR");
const bad = await login("student1@smartcanteen.test", "wrongpass");
ok("wrong password rejected (401)", bad.status === 401);

console.log("\n=== Authorization (RBAC) ===");
const forbidden = await call("/api/vendor/orders", student.cookie);
ok("student blocked from vendor API (403)", forbidden.status === 403);

console.log("\n=== Place order (transaction) ===");
const slots = await call(`/api/slots?canteen_id=1&date=${today}`, student.cookie);
const slot = slots.json.data?.[0];
ok("a pickup slot is available for canteen 1 today", !!slot, JSON.stringify(slots.json).slice(0, 120));
const stockBefore1 = Number(await scalar("SELECT quantity_available FROM inventory WHERE food_id=1"));
const stockBefore2 = Number(await scalar("SELECT quantity_available FROM inventory WHERE food_id=2"));
const bookedBefore = Number(await scalar("SELECT booked_count FROM pickup_slot WHERE slot_id=?", [slot?.slot_id]));

const place = await call("/api/orders", student.cookie, "POST", {
  canteen_id: 1, slot_id: slot.slot_id,
  items: [{ food_id: 1, quantity: 2 }, { food_id: 2, quantity: 1 }],
  special_instructions: "e2e test",
});
ok("order placed (201)", place.status === 201, JSON.stringify(place.json).slice(0, 160));
const orderId = place.json.data?.order_id;
ok("order total = 2×60 + 1×45 = 165", Number(place.json.data?.total_amount) === 165, `got ${place.json.data?.total_amount}`);
ok("inventory for food 1 deducted by 2", Number(await scalar("SELECT quantity_available FROM inventory WHERE food_id=1")) === stockBefore1 - 2);
ok("inventory for food 2 deducted by 1", Number(await scalar("SELECT quantity_available FROM inventory WHERE food_id=2")) === stockBefore2 - 1);
ok("slot booked_count incremented", Number(await scalar("SELECT booked_count FROM pickup_slot WHERE slot_id=?", [slot.slot_id])) === bookedBefore + 1);
ok("MongoDB activity log recorded ORDER_PLACED",
  (await logs.countDocuments({ order_id: orderId, event_type: "ORDER_PLACED" })) === 1);

console.log("\n=== Insufficient stock ===");
// Order more than is in stock but within the per-item validation cap (<=50),
// so the request reaches the transactional stock check (409), not validation (400).
const overQty = Math.min(50, stockBefore1 + 1);
const huge = await call("/api/orders", student.cookie, "POST", {
  canteen_id: 1, slot_id: slot.slot_id, items: [{ food_id: 1, quantity: overQty }],
});
ok("over-ordering beyond stock rejected (409)", huge.status === 409, `status ${huge.status} qty ${overQty}`);

console.log("\n=== Vendor status transitions (trigger audit) ===");
const auditBefore = Number(await scalar("SELECT COUNT(*) FROM order_status_audit WHERE order_id=?", [orderId]));
for (const s of ["PREPARING", "READY", "COLLECTED"]) {
  const r = await call(`/api/vendor/orders/${orderId}/status`, vendor.cookie, "PATCH", { status: s });
  ok(`vendor set status ${s}`, r.status === 200, JSON.stringify(r.json).slice(0, 120));
}
ok("invalid transition COLLECTED→PREPARING rejected (409)",
  (await call(`/api/vendor/orders/${orderId}/status`, vendor.cookie, "PATCH", { status: "PREPARING" })).status === 409);
ok("trigger logged 3 status changes to audit table",
  Number(await scalar("SELECT COUNT(*) FROM order_status_audit WHERE order_id=?", [orderId])) === auditBefore + 3);

console.log("\n=== Cancellation (restores stock + slot) ===");
const place2 = await call("/api/orders", student.cookie, "POST", {
  canteen_id: 1, slot_id: slot.slot_id, items: [{ food_id: 3, quantity: 4 }],
});
const order2 = place2.json.data.order_id;
const stock3After = Number(await scalar("SELECT quantity_available FROM inventory WHERE food_id=3"));
const bookedAfter2 = Number(await scalar("SELECT booked_count FROM pickup_slot WHERE slot_id=?", [slot.slot_id]));
const cancel = await call(`/api/orders/${order2}/cancel`, student.cookie, "POST");
ok("order cancelled (200)", cancel.status === 200);
ok("inventory for food 3 restored (+4)", Number(await scalar("SELECT quantity_available FROM inventory WHERE food_id=3")) === stock3After + 4);
ok("slot capacity released (-1)", Number(await scalar("SELECT booked_count FROM pickup_slot WHERE slot_id=?", [slot.slot_id])) === bookedAfter2 - 1);
ok("double-cancel rejected (409)", (await call(`/api/orders/${order2}/cancel`, student.cookie, "POST")).status === 409);
ok("order status is CANCELLED", (await scalar("SELECT status FROM orders WHERE order_id=?", [order2])) === "CANCELLED");

await db.end();
await mongo.close();
console.log(`\n================  ${pass} passed, ${fail} failed  ================`);
process.exit(fail ? 1 : 0);
