// ============================================================================
// Order business logic — the transactional / concurrency centrepiece.
//
// place_order and cancel_order run inside a single MySQL transaction and take
// row-level locks (SELECT ... FOR UPDATE) on the inventory rows and the pickup
// slot before mutating them. This makes the following impossible, even under
// concurrent requests:
//   * negative inventory          (locked recheck + CHECK quantity_available>=0)
//   * pickup slot overbooking      (locked recheck + CHECK booked_count<=capacity)
//   * duplicate inventory deduction / duplicate restoration on cancel
//   * partial / incomplete orders  (all-or-nothing commit)
//
// MongoDB activity logging is best-effort and runs AFTER commit, so a logging
// outage can never roll back a real order.
// ============================================================================
import type { PoolConnection } from "mysql2/promise";
import { withTransaction, query, queryOne } from "./mysql";
import { HttpError } from "./auth";
import { logActivity } from "./mongo";
import type { PlaceOrderInput } from "./validation";

export interface PlacedOrder {
  order_id: number;
  total_amount: number;
  slot_id: number;
  canteen_id: number;
}

// Allowed order status transitions (state machine). Vendor drives PREPARING ->
// READY -> COLLECTED; cancellation allowed only before COLLECTED.
const TRANSITIONS: Record<string, string[]> = {
  PLACED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COLLECTED", "CANCELLED"],
  COLLECTED: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Place an order for `studentId`. Throws HttpError(409) on insufficient stock
 * or a full slot; the whole transaction rolls back automatically.
 */
export async function placeOrder(
  studentId: number,
  input: PlaceOrderInput
): Promise<PlacedOrder> {
  const result = await withTransaction(async (conn) => {
    // 1. Validate the slot belongs to the canteen and lock it.
    const [slotRows] = await conn.execute(
      `SELECT slot_id, canteen_id, capacity, booked_count, slot_date
         FROM pickup_slot
        WHERE slot_id = ? AND canteen_id = ?
        FOR UPDATE`,
      [input.slot_id, input.canteen_id]
    );
    const slot = (slotRows as any[])[0];
    if (!slot) throw new HttpError(404, "Pickup slot not found for this canteen.");
    if (slot.booked_count >= slot.capacity) {
      throw new HttpError(409, "This pickup slot is fully booked. Choose another slot.");
    }

    // 2. Lock + validate each food item and its inventory (ordered by food_id
    //    to avoid deadlocks between concurrent orders).
    const items = [...input.items].sort((a, b) => a.food_id - b.food_id);
    let total = 0;
    const lines: { food_id: number; quantity: number; unit_price: number }[] = [];

    for (const item of items) {
      const [foodRows] = await conn.execute(
        `SELECT f.food_id, f.canteen_id, f.price, f.is_available,
                i.inventory_id, i.quantity_available
           FROM food_item f
           JOIN inventory i ON i.food_id = f.food_id
          WHERE f.food_id = ?
          FOR UPDATE`,
        [item.food_id]
      );
      const food = (foodRows as any[])[0];
      if (!food) throw new HttpError(404, `Food item ${item.food_id} not found.`);
      if (food.canteen_id !== input.canteen_id) {
        throw new HttpError(400, "All items in an order must be from the same canteen.");
      }
      if (!food.is_available) {
        throw new HttpError(409, `"${food.food_id}" is currently unavailable.`);
      }
      if (food.quantity_available < item.quantity) {
        throw new HttpError(409, `Not enough stock for item ${item.food_id} (have ${food.quantity_available}).`);
      }
      total += Number(food.price) * item.quantity;
      lines.push({ food_id: item.food_id, quantity: item.quantity, unit_price: Number(food.price) });
    }

    // 3. Create the order.
    const [orderRes]: any = await conn.execute(
      `INSERT INTO orders (user_id, slot_id, canteen_id, status, total_amount, payment_status, special_instructions)
       VALUES (?, ?, ?, 'PLACED', ?, 'PENDING', ?)`,
      [studentId, input.slot_id, input.canteen_id, total.toFixed(2), input.special_instructions ?? null]
    );
    const orderId = orderRes.insertId as number;

    // 4. Insert items + deduct inventory (deduction guarded by CHECK >= 0).
    for (const line of lines) {
      await conn.execute(
        `INSERT INTO order_item (order_id, food_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        [orderId, line.food_id, line.quantity, line.unit_price]
      );
      await conn.execute(
        `UPDATE inventory SET quantity_available = quantity_available - ? WHERE food_id = ?`,
        [line.quantity, line.food_id]
      );
    }

    // 5. Reserve the slot (CHECK booked_count <= capacity blocks overbooking).
    await conn.execute(
      `UPDATE pickup_slot SET booked_count = booked_count + 1 WHERE slot_id = ?`,
      [input.slot_id]
    );

    return { order_id: orderId, total_amount: Number(total.toFixed(2)), slot_id: input.slot_id, canteen_id: input.canteen_id };
  });

  // 6. Best-effort activity log (after commit).
  await safeLog({
    order_id: result.order_id,
    student_id: studentId,
    event_type: "ORDER_PLACED",
    previous_status: null,
    new_status: "PLACED",
    description: `Order placed for ₹${result.total_amount}`,
  });

  return result;
}

/**
 * Cancel an order owned by `studentId` (or by a vendor via vendorCancel).
 * Restores inventory and releases the slot exactly once, guarded by the
 * status check inside the same transaction.
 */
export async function cancelOrder(orderId: number, actor: { id: number; role: string }) {
  const outcome = await withTransaction(async (conn) => {
    const [orderRows] = await conn.execute(
      `SELECT order_id, user_id, slot_id, canteen_id, status
         FROM orders WHERE order_id = ? FOR UPDATE`,
      [orderId]
    );
    const order = (orderRows as any[])[0];
    if (!order) throw new HttpError(404, "Order not found.");

    // Authorization: a student may only cancel their own order.
    if (actor.role === "STUDENT" && order.user_id !== actor.id) {
      throw new HttpError(403, "You can only cancel your own orders.");
    }

    // Eligibility: cannot cancel after collection, and cannot double-cancel.
    if (order.status === "COLLECTED") {
      throw new HttpError(409, "Collected orders cannot be cancelled.");
    }
    if (order.status === "CANCELLED") {
      throw new HttpError(409, "Order is already cancelled.");
    }

    // Restore inventory for each line (exactly once — we are inside the lock
    // and about to flip status to CANCELLED).
    const [lines] = await conn.execute(
      `SELECT food_id, quantity FROM order_item WHERE order_id = ?`,
      [orderId]
    );
    for (const line of lines as any[]) {
      await conn.execute(
        `UPDATE inventory SET quantity_available = quantity_available + ? WHERE food_id = ?`,
        [line.quantity, line.food_id]
      );
    }

    // Release the slot (floor at 0 just in case).
    await conn.execute(
      `UPDATE pickup_slot SET booked_count = GREATEST(booked_count - 1, 0) WHERE slot_id = ?`,
      [order.slot_id]
    );

    await conn.execute(
      `UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW(),
              payment_status = CASE WHEN payment_status = 'PAID' THEN 'REFUNDED' ELSE payment_status END
         WHERE order_id = ?`,
      [orderId]
    );

    return { order_id: orderId, previous: order.status, student_id: order.user_id };
  });

  await safeLog({
    order_id: outcome.order_id,
    student_id: outcome.student_id,
    event_type: "ORDER_CANCELLED",
    previous_status: outcome.previous,
    new_status: "CANCELLED",
    description: `Cancelled by ${actor.role.toLowerCase()}`,
  });

  return outcome;
}

/** Vendor advances an order through the prep -> ready -> collected lifecycle. */
export async function updateOrderStatus(
  orderId: number,
  newStatus: "PREPARING" | "READY" | "COLLECTED" | "CANCELLED",
  vendor: { id: number }
) {
  if (newStatus === "CANCELLED") {
    return cancelOrder(orderId, { id: vendor.id, role: "VENDOR" });
  }

  const outcome = await withTransaction(async (conn) => {
    // Lock the order and confirm it belongs to a canteen this vendor manages.
    const [rows] = await conn.execute(
      `SELECT o.order_id, o.status, c.vendor_id
         FROM orders o JOIN canteen c ON o.canteen_id = c.canteen_id
        WHERE o.order_id = ? FOR UPDATE`,
      [orderId]
    );
    const order = (rows as any[])[0];
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.vendor_id !== vendor.id) {
      throw new HttpError(403, "You can only manage orders for your own canteen.");
    }
    if (!canTransition(order.status, newStatus)) {
      throw new HttpError(409, `Invalid status transition ${order.status} -> ${newStatus}.`);
    }
    await conn.execute(`UPDATE orders SET status = ? WHERE order_id = ?`, [newStatus, orderId]);
    return { order_id: orderId, previous: order.status, new: newStatus };
  });

  await safeLog({
    order_id: outcome.order_id,
    student_id: null,
    event_type: `ORDER_${outcome.new}`,
    previous_status: outcome.previous,
    new_status: outcome.new,
    description: `Vendor set status to ${outcome.new}`,
  });

  return outcome;
}

async function safeLog(entry: Parameters<typeof logActivity>[0]) {
  try {
    await logActivity(entry);
  } catch (err) {
    console.error("Activity log (Mongo) failed — order is still committed:", err);
  }
}
