import { NextRequest } from "next/server";
import { foodUpdateSchema } from "@/lib/validation";
import { requireRole, HttpError } from "@/lib/auth";
import { query, queryOne } from "@/lib/mysql";
import { ok, fail, handleError } from "@/lib/http";

// Confirm the vendor owns the canteen this food belongs to.
async function assertOwns(foodId: number, vendorId: number) {
  const row = await queryOne(
    `SELECT f.food_id FROM food_item f JOIN canteen c ON f.canteen_id=c.canteen_id
      WHERE f.food_id = ? AND c.vendor_id = ?`,
    [foodId, vendorId]
  );
  if (!row) throw new HttpError(403, "You can only edit items in your own canteen.");
}

// Update food fields (price, availability, etc.).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = requireRole("VENDOR");
    const foodId = Number(params.id);
    await assertOwns(foodId, vendor.user_id);
    const body = foodUpdateSchema.parse(await req.json());

    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ["food_name", "category", "price", "is_available", "preparation_time", "image_url"] as const) {
      if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    }
    if (!fields.length) return fail(400, "No fields to update.");
    values.push(foodId);
    await query(`UPDATE food_item SET ${fields.join(", ")} WHERE food_id = ?`, values);
    return ok({ updated: true });
  } catch (err) {
    return handleError(err);
  }
}

// Delete a food item (inventory + unsold references cascade per FK rules).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vendor = requireRole("VENDOR");
    const foodId = Number(params.id);
    await assertOwns(foodId, vendor.user_id);
    try {
      await query(`DELETE FROM food_item WHERE food_id = ?`, [foodId]);
    } catch (e: any) {
      // RESTRICT from order_item if the food appears in historical orders.
      if (e?.code === "ER_ROW_IS_REFERENCED_2") {
        return fail(409, "This item appears in past orders; mark it unavailable instead of deleting.");
      }
      throw e;
    }
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
