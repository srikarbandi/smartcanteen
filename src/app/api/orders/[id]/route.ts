import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { getOrderDetail } from "@/lib/data";
import { ok, fail, handleError } from "@/lib/http";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireUser();
    const order: any = await getOrderDetail(Number(params.id));
    if (!order) return fail(404, "Order not found.");
    // Students see only their own orders; vendors only their canteen's.
    if (user.role === "STUDENT" && order.user_id !== user.user_id) {
      throw new HttpError(403, "Forbidden");
    }
    return ok(order);
  } catch (err) {
    return handleError(err);
  }
}
