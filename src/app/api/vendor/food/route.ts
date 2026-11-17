import { NextRequest } from "next/server";
import { foodItemSchema } from "@/lib/validation";
import { requireRole, HttpError } from "@/lib/auth";
import { withTransaction, queryOne } from "@/lib/mysql";
import { getVendorFood, getVendorCanteens } from "@/lib/data";
import { ok, fail, handleError } from "@/lib/http";

// List this vendor's food items.
export async function GET() {
  try {
    const vendor = requireRole("VENDOR");
    return ok(await getVendorFood(vendor.user_id));
  } catch (err) {
    return handleError(err);
  }
}

// Create a food item (+ its inventory row) in one of the vendor's canteens.
export async function POST(req: NextRequest) {
  try {
    const vendor = requireRole("VENDOR");
    const raw = await req.json();
    const body = foodItemSchema.parse(raw);
    const canteenId = Number(raw.canteen_id);

    // Ownership: the target canteen must belong to this vendor.
    const owns = await queryOne(
      `SELECT canteen_id FROM canteen WHERE canteen_id = ? AND vendor_id = ?`,
      [canteenId, vendor.user_id]
    );
    if (!owns) throw new HttpError(403, "You can only add items to your own canteen.");

    const created = await withTransaction(async (conn) => {
      const [res]: any = await conn.execute(
        `INSERT INTO food_item (canteen_id, food_name, category, price, is_available, preparation_time, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [canteenId, body.food_name, body.category, body.price, body.is_available,
         body.preparation_time ?? null, body.image_url ?? null]
      );
      const foodId = res.insertId as number;
      await conn.execute(
        `INSERT INTO inventory (food_id, quantity_available) VALUES (?, ?)`,
        [foodId, body.initial_stock ?? 0]
      );
      return { food_id: foodId };
    });
    return ok(created, 201);
  } catch (err) {
    return handleError(err);
  }
}
