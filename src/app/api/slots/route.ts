import { NextRequest } from "next/server";
import { getAvailableSlots } from "@/lib/data";
import { ok, fail, handleError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const canteenId = Number(sp.get("canteen_id"));
    const date = sp.get("date"); // YYYY-MM-DD
    if (!canteenId || !date) return fail(400, "canteen_id and date are required.");
    return ok(await getAvailableSlots(canteenId, date));
  } catch (err) {
    return handleError(err);
  }
}
