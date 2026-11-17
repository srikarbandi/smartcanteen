import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { getVendorOrders } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

// Incoming orders for this vendor's canteen(s), optionally filtered by status.
export async function GET(req: NextRequest) {
  try {
    const vendor = requireRole("VENDOR");
    const status = req.nextUrl.searchParams.get("status") || undefined;
    return ok(await getVendorOrders(vendor.user_id, status));
  } catch (err) {
    return handleError(err);
  }
}
