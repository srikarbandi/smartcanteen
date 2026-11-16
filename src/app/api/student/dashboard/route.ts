import { requireRole } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    const user = requireRole("STUDENT");
    return ok(await getStudentDashboard(user.user_id));
  } catch (err) {
    return handleError(err);
  }
}
