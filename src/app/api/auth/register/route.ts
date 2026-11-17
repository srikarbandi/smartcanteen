import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validation";
import { hashPassword, setSession } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@/lib/mysql";
import { ok, fail, handleError } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());

    const existing = await queryOne(`SELECT user_id FROM users WHERE email = ?`, [body.email]);
    if (existing) return fail(409, "An account with that email already exists.");

    const password_hash = await hashPassword(body.password);

    const user = await withTransaction(async (conn) => {
      const [res]: any = await conn.execute(
        `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'STUDENT')`,
        [body.name, body.email, password_hash]
      );
      const id = res.insertId as number;
      if (body.phone) {
        await conn.execute(
          `INSERT INTO user_phone (user_id, phone_number) VALUES (?, ?)`,
          [id, body.phone]
        );
      }
      return { user_id: id, name: body.name, role: "STUDENT" as const };
    });

    setSession({ user_id: user.user_id, role: "STUDENT", name: user.name });
    return ok({ user_id: user.user_id, name: user.name, role: "STUDENT" }, 201);
  } catch (err) {
    return handleError(err);
  }
}
