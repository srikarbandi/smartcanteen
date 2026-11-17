import { requireRole } from "@/lib/auth";
import { getVendorDashboard } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const vendor = requireRole("VENDOR");
    return ok(await getVendorDashboard(vendor.user_id));
  } catch (err) {
    return handleError(err);
  }
}
