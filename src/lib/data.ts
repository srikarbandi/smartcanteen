// Read-side data access (parameterized queries) shared by API routes and
// server components. Writes that need transactions live in orders.ts.
import { query, queryOne } from "./mysql";
import { feedbackCol } from "./mongo";

// ---- Public / shared -------------------------------------------------------
export function getCanteens() {
  return query(
    `SELECT canteen_id, canteen_name, location, description, operating_hours
       FROM canteen ORDER BY canteen_name`
  );
}

export interface MenuFilter {
  canteenId?: number;
  q?: string;
  category?: string;
  availableOnly?: boolean;
}

export function getMenu(f: MenuFilter) {
  const where: string[] = [];
  const params: any[] = [];
  if (f.canteenId) { where.push("f.canteen_id = ?"); params.push(f.canteenId); }
  if (f.category)  { where.push("f.category = ?");   params.push(f.category); }
  if (f.q)         { where.push("f.food_name LIKE ?"); params.push(`%${f.q}%`); }
  if (f.availableOnly) { where.push("f.is_available = TRUE"); }
  const sql =
    `SELECT f.food_id, f.canteen_id, c.canteen_name, f.food_name, f.category,
            f.price, f.is_available, f.preparation_time, f.image_url,
            COALESCE(i.quantity_available, 0) AS quantity_available
       FROM food_item f
       JOIN canteen c   ON f.canteen_id = c.canteen_id
       LEFT JOIN inventory i ON f.food_id = i.food_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY f.category, f.food_name`;
  return query(sql, params);
}

export function getCategories(canteenId?: number) {
  return query(
    `SELECT DISTINCT category FROM food_item
      ${canteenId ? "WHERE canteen_id = ?" : ""}
      ORDER BY category`,
    canteenId ? [canteenId] : []
  );
}

// Uses the stored procedure get_available_pickup_slots.
export async function getAvailableSlots(canteenId: number, date: string) {
  const rows = await query(`CALL get_available_pickup_slots(?, ?)`, [canteenId, date]);
  // CALL returns [resultRows, okPacket]; mysql2 gives rows[0] as the data set.
  return Array.isArray(rows[0]) ? (rows[0] as any[]) : (rows as any[]);
}

// ---- Student ---------------------------------------------------------------
export function getStudentOrders(studentId: number) {
  return query(
    `SELECT o.order_id, o.canteen_id, c.canteen_name, o.order_date, o.status,
            o.payment_status, o.total_amount,
            ps.slot_date, ps.start_time, ps.end_time,
            (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.order_id) AS item_count
       FROM orders o
       JOIN canteen c     ON o.canteen_id = c.canteen_id
       JOIN pickup_slot ps ON o.slot_id = ps.slot_id
      WHERE o.user_id = ?
      ORDER BY o.order_date DESC`,
    [studentId]
  );
}

export async function getOrderDetail(orderId: number) {
  const order = await queryOne(
    `SELECT o.*, c.canteen_name, ps.slot_date, ps.start_time, ps.end_time, u.name AS student_name
       FROM orders o
       JOIN canteen c      ON o.canteen_id = c.canteen_id
       JOIN pickup_slot ps ON o.slot_id = ps.slot_id
       JOIN users u        ON o.user_id = u.user_id
      WHERE o.order_id = ?`,
    [orderId]
  );
  if (!order) return null;
  const items = await query(
    `SELECT oi.order_item_id, oi.food_id, f.food_name, oi.quantity, oi.unit_price,
            (oi.quantity * oi.unit_price) AS line_total
       FROM order_item oi JOIN food_item f ON oi.food_id = f.food_id
      WHERE oi.order_id = ?`,
    [orderId]
  );
  return { ...order, items };
}

export async function getStudentDashboard(studentId: number) {
  const [active] = await query(
    `SELECT COUNT(*) AS c FROM orders WHERE user_id = ? AND status IN ('PLACED','PREPARING','READY')`,
    [studentId]
  );
  const [past] = await query(
    `SELECT COUNT(*) AS c FROM orders WHERE user_id = ? AND status IN ('COLLECTED','CANCELLED')`,
    [studentId]
  );
  const [spend] = await query(
    `SELECT COALESCE(SUM(total_amount),0) AS s FROM orders WHERE user_id = ? AND status <> 'CANCELLED'`,
    [studentId]
  );
  const upcoming = await query(
    `SELECT o.order_id, c.canteen_name, o.status, ps.slot_date, ps.start_time
       FROM orders o JOIN canteen c ON o.canteen_id=c.canteen_id
       JOIN pickup_slot ps ON o.slot_id=ps.slot_id
      WHERE o.user_id = ? AND o.status IN ('PLACED','PREPARING','READY')
      ORDER BY ps.slot_date, ps.start_time LIMIT 5`,
    [studentId]
  );
  return {
    activeOrders: Number(active.c),
    pastOrders: Number(past.c),
    lifetimeSpend: Number(spend.s),
    upcoming,
  };
}

// ---- Vendor ----------------------------------------------------------------
export function getVendorCanteens(vendorId: number) {
  return query(
    `SELECT canteen_id, canteen_name, location FROM canteen WHERE vendor_id = ? ORDER BY canteen_name`,
    [vendorId]
  );
}

export function getVendorFood(vendorId: number) {
  return query(
    `SELECT f.food_id, f.canteen_id, c.canteen_name, f.food_name, f.category,
            f.price, f.is_available, f.preparation_time, f.image_url,
            COALESCE(i.quantity_available,0) AS quantity_available
       FROM food_item f
       JOIN canteen c ON f.canteen_id = c.canteen_id
       LEFT JOIN inventory i ON f.food_id = i.food_id
      WHERE c.vendor_id = ?
      ORDER BY c.canteen_name, f.category, f.food_name`,
    [vendorId]
  );
}

export function getVendorOrders(vendorId: number, status?: string) {
  const params: any[] = [vendorId];
  let statusClause = "";
  if (status) { statusClause = "AND o.status = ?"; params.push(status); }
  return query(
    `SELECT o.order_id, o.status, o.order_date, o.total_amount, o.payment_status,
            u.name AS student_name, ps.slot_date, ps.start_time, ps.end_time,
            o.special_instructions,
            (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id=o.order_id) AS item_count
       FROM orders o
       JOIN canteen c      ON o.canteen_id = c.canteen_id
       JOIN users u        ON o.user_id = u.user_id
       JOIN pickup_slot ps ON o.slot_id = ps.slot_id
      WHERE c.vendor_id = ? ${statusClause}
      ORDER BY o.order_date DESC`,
    params
  );
}

export async function getVendorDashboard(vendorId: number) {
  const [today] = await query(
    `SELECT COUNT(*) AS orders_today, COALESCE(SUM(total_amount),0) AS sales_today
       FROM orders o JOIN canteen c ON o.canteen_id=c.canteen_id
      WHERE c.vendor_id = ? AND DATE(o.order_date)=CURDATE() AND o.status<>'CANCELLED'`,
    [vendorId]
  );
  const [pending] = await query(
    `SELECT COUNT(*) AS c FROM orders o JOIN canteen c ON o.canteen_id=c.canteen_id
      WHERE c.vendor_id=? AND o.status='PLACED'`,
    [vendorId]
  );
  const [preparing] = await query(
    `SELECT COUNT(*) AS c FROM orders o JOIN canteen c ON o.canteen_id=c.canteen_id
      WHERE c.vendor_id=? AND o.status='PREPARING'`,
    [vendorId]
  );
  const lowStock = await getLowStock(vendorId, 15);
  // Average feedback rating from MongoDB (across this vendor's canteens).
  const canteens = await getVendorCanteens(vendorId);
  const ids = canteens.map((c: any) => c.canteen_id);
  let avgRating: number | null = null;
  let feedbackCount = 0;
  if (ids.length) {
    const col = await feedbackCol();
    const agg = await col.aggregate([
      { $match: { canteen_id: { $in: ids } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]).toArray();
    if (agg[0]) { avgRating = Math.round(agg[0].avg * 100) / 100; feedbackCount = agg[0].count; }
  }
  return {
    ordersToday: Number(today.orders_today),
    salesToday: Number(today.sales_today),
    pendingOrders: Number(pending.c),
    preparingOrders: Number(preparing.c),
    lowStock,
    avgRating,
    feedbackCount,
  };
}

export function getLowStock(vendorId: number, threshold = 15) {
  return query(
    `SELECT f.food_id, f.food_name, i.quantity_available
       FROM food_item f
       JOIN canteen c   ON f.canteen_id=c.canteen_id
       JOIN inventory i ON f.food_id=i.food_id
      WHERE c.vendor_id = ? AND i.quantity_available <= ?
      ORDER BY i.quantity_available ASC`,
    [vendorId, threshold]
  );
}

// Feedback analytics per canteen (MongoDB aggregation) for a vendor.
export async function getVendorFeedbackAnalytics(vendorId: number) {
  const canteens = await getVendorCanteens(vendorId);
  const ids = canteens.map((c: any) => c.canteen_id);
  if (!ids.length) return [];
  const col = await feedbackCol();
  const agg = await col.aggregate([
    { $match: { canteen_id: { $in: ids } } },
    { $group: { _id: "$canteen_id", averageRating: { $avg: "$rating" }, feedbackCount: { $sum: 1 } } },
    { $project: { _id: 0, canteen_id: "$_id", averageRating: { $round: ["$averageRating", 2] }, feedbackCount: 1 } },
    { $sort: { averageRating: -1 } },
  ]).toArray();
  // Attach canteen names.
  const nameById = new Map(canteens.map((c: any) => [c.canteen_id, c.canteen_name]));
  return agg.map((a: any) => ({ ...a, canteen_name: nameById.get(a.canteen_id) ?? `Canteen ${a.canteen_id}` }));
}

// Recent feedback comments for a vendor's canteens.
export async function getVendorFeedbackComments(vendorId: number, limit = 20) {
  const canteens = await getVendorCanteens(vendorId);
  const ids = canteens.map((c: any) => c.canteen_id);
  if (!ids.length) return [];
  const col = await feedbackCol();
  return col.find({ canteen_id: { $in: ids } }).sort({ timestamp: -1 }).limit(limit).toArray();
}
