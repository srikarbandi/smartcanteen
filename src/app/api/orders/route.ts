import { NextRequest } from "next/server";
import { placeOrderSchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { placeOrder } from "@/lib/orders";
import { getStudentOrders } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

// Place an order (student only).
export async function POST(req: NextRequest) {
  try {
    const user = requireRole("STUDENT");
    const input = placeOrderSchema.parse(await req.json());
    const result = await placeOrder(user.user_id, input);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}

// Student's own order history.
export async function GET() {
  try {
    const user = requireRole("STUDENT");
    return ok(await getStudentOrders(user.user_id));
  } catch (err) {
    return handleError(err);
  }
}
