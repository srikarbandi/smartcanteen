import { requireRole } from "@/lib/auth";
import { getVendorFeedbackAnalytics, getVendorFeedbackComments } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

// Feedback analytics (MongoDB aggregation) + recent comments for the vendor.
export async function GET() {
  try {
    const vendor = requireRole("VENDOR");
    const [analytics, comments] = await Promise.all([
      getVendorFeedbackAnalytics(vendor.user_id),
      getVendorFeedbackComments(vendor.user_id, 20),
    ]);
    return ok({ analytics, comments });
  } catch (err) {
    return handleError(err);
  }
}
