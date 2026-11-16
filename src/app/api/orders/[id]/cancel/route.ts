import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { cancelOrder } from "@/lib/orders";
import { ok, handleError } from "@/lib/http";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = requireUser();
    const result = await cancelOrder(Number(params.id), { id: user.user_id, role: user.role });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
