import { NextRequest } from "next/server";
import { statusUpdateSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/orders";
import { ok, handleError } from "@/lib/http";

// Advance an order PLACED -> PREPARING -> READY -> COLLECTED (or CANCELLED).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = requireRole("VENDOR");
    const { status } = statusUpdateSchema.parse(await req.json());
    const result = await updateOrderStatus(Number(params.id), status, { id: vendor.user_id });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
