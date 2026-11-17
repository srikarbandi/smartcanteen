import { NextRequest } from "next/server";
import { feedbackSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { queryOne } from "@/lib/mysql";
import { feedbackCol } from "@/lib/mongo";
import { ok, fail, handleError } from "@/lib/http";

// Submit feedback for a collected order (student). Stored in MongoDB.
export async function POST(req: NextRequest) {
  try {
    const user = requireRole("STUDENT");
    const body = feedbackSchema.parse(await req.json());

    // Verify the order belongs to this student and is collected.
    const order = await queryOne<{ canteen_id: number; status: string }>(
      `SELECT canteen_id, status FROM orders WHERE order_id = ? AND user_id = ?`,
      [body.order_id, user.user_id]
    );
    if (!order) return fail(404, "Order not found.");
    if (order.status !== "COLLECTED") {
      return fail(409, "You can only rate orders you have collected.");
    }

    const col = await feedbackCol();
    // One feedback per order.
    const existing = await col.findOne({ order_id: body.order_id, student_id: user.user_id });
    if (existing) return fail(409, "You have already rated this order.");

    await col.insertOne({
      student_id: user.user_id,
      order_id: body.order_id,
      canteen_id: order.canteen_id,
      rating: body.rating,
      comment: body.comment ?? null,
      timestamp: new Date(),
    });
    return ok({ submitted: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}
