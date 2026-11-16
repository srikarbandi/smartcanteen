import { NextRequest } from "next/server";
import { getMenu, getCategories } from "@/lib/data";
import { ok, handleError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const canteenId = sp.get("canteen_id") ? Number(sp.get("canteen_id")) : undefined;
    const items = await getMenu({
      canteenId,
      q: sp.get("q") || undefined,
      category: sp.get("category") || undefined,
      availableOnly: sp.get("available") === "1",
    });
    const categories = await getCategories(canteenId);
    return ok({ items, categories });
  } catch (err) {
    return handleError(err);
  }
}
