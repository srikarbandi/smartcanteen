import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, setSession, type Role } from "@/lib/auth";
import { queryOne } from "@/lib/mysql";
import { ok, fail, handleError } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await queryOne<{ user_id: number; name: string; role: Role; password_hash: string }>(
      `SELECT user_id, name, role, password_hash FROM users WHERE email = ?`,
      [body.email]
    );
    // Same generic error whether the email or password is wrong.
    if (!user || !(await verifyPassword(body.password, user.password_hash))) {
      return fail(401, "Invalid email or password.");
    }
    setSession({ user_id: user.user_id, role: user.role, name: user.name });
    return ok({ user_id: user.user_id, name: user.name, role: user.role });
  } catch (err) {
    return handleError(err);
  }
}
