import { NextRequest } from "next/server";
import { inventoryUpdateSchema } from "@/lib/validation";
import { requireRole, HttpError } from "@/lib/auth";
import { query, queryOne } from "@/lib/mysql";
import { ok, handleError } from "@/lib/http";

// Set absolute stock level for a food item in the vendor's canteen.
export async function PATCH(req: NextRequest, { params }: { params: { foodId: string } }) {
  try {
    const vendor = requireRole("VENDOR");
    const foodId = Number(params.foodId);
    const owns = await queryOne(
      `SELECT f.food_id FROM food_item f JOIN canteen c ON f.canteen_id=c.canteen_id
        WHERE f.food_id = ? AND c.vendor_id = ?`,
      [foodId, vendor.user_id]
    );
    if (!owns) throw new HttpError(403, "You can only manage your own inventory.");

    const body = inventoryUpdateSchema.parse(await req.json());
    await query(`UPDATE inventory SET quantity_available = ? WHERE food_id = ?`,
      [body.quantity_available, foodId]);
    return ok({ updated: true, quantity_available: body.quantity_available });
  } catch (err) {
    return handleError(err);
  }
}
