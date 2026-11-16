// Authentication + session helpers.
// - Passwords hashed with bcrypt (bcryptjs = pure-JS bcrypt, same algorithm).
// - Session is a signed, HTTP-only cookie carrying {user_id, role}. The
//   signature (HMAC-SHA256 over the payload with SESSION_SECRET) prevents
//   tampering; there is no server-side session store to keep this simple.
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sc_session";
const MAX_AGE = Number(process.env.SESSION_MAX_AGE || 60 * 60 * 24 * 7);

export type Role = "STUDENT" | "VENDOR" | "ADMIN";
export interface SessionUser {
  user_id: number;
  role: Role;
  name: string;
}

// ---- password hashing ------------------------------------------------------
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---- signed cookie payload -------------------------------------------------
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short. Set it in .env.local.");
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encode(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): SessionUser | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  // constant-time compare
  if (sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

// ---- cookie lifecycle (server components / route handlers) -----------------
export function setSession(user: SessionUser) {
  cookies().set(COOKIE_NAME, encode(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function getSession(): SessionUser | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  return token ? decode(token) : null;
}

// ---- authorization guards --------------------------------------------------
export function requireUser(): SessionUser {
  const u = getSession();
  if (!u) throw new HttpError(401, "Not authenticated");
  return u;
}

export function requireRole(...roles: Role[]): SessionUser {
  const u = requireUser();
  if (!roles.includes(u.role)) throw new HttpError(403, "Forbidden");
  return u;
}

// ---- tiny HTTP error used by route handlers --------------------------------
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
