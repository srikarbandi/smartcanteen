import { getCanteens } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

export async function GET() {
  try {
    return ok(await getCanteens());
  } catch (err) {
    return handleError(err);
  }
}
