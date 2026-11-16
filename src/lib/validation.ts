// Shared input-validation schemas (zod). Backend route handlers parse all
// request bodies through these — validation layer #2 (frontend is #1, DB
// constraints are #3).
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  password: z.string().min(8).max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/).optional(),
  // Only STUDENT self-registration is allowed from the public form.
  role: z.enum(["STUDENT"]).default("STUDENT"),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(150),
  password: z.string().min(1).max(100),
});

export const cartItemSchema = z.object({
  food_id: z.number().int().positive(),
  quantity: z.number().int().positive().max(50),
});

export const placeOrderSchema = z.object({
  canteen_id: z.number().int().positive(),
  slot_id: z.number().int().positive(),
  items: z.array(cartItemSchema).min(1).max(30),
  special_instructions: z.string().trim().max(500).optional(),
});

export const foodItemSchema = z.object({
  food_name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(50),
  price: z.number().nonnegative().max(100000),
  is_available: z.boolean().default(true),
  preparation_time: z.number().int().nonnegative().max(600).nullable().optional(),
  image_url: z.string().url().max(500).nullable().optional(),
  initial_stock: z.number().int().nonnegative().max(100000).optional(),
});

export const foodUpdateSchema = foodItemSchema.partial();

export const inventoryUpdateSchema = z.object({
  quantity_available: z.number().int().nonnegative().max(100000),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["PREPARING", "READY", "COLLECTED", "CANCELLED"]),
});

export const feedbackSchema = z.object({
  order_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
