// Helpers to keep route handlers short and consistent.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";

export function ok(data: unknown, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ ok: false, error: message, details: extra }, { status });
}

/** Map thrown errors (HttpError, ZodError, MySQL errors) to JSON responses. */
export function handleError(err: unknown) {
  if (err instanceof HttpError) return fail(err.status, err.message);
  if (err instanceof ZodError) {
    return fail(400, "Validation failed", err.flatten());
  }
  // MySQL CHECK / FK / unique violations surface here.
  const e = err as { code?: string; sqlMessage?: string; message?: string };
  if (e?.code === "ER_DUP_ENTRY") return fail(409, "That record already exists.");
  if (e?.code === "ER_CHECK_CONSTRAINT_VIOLATED") return fail(400, "A database constraint was violated.");
  console.error("Unhandled route error:", err);
  return fail(500, "Internal server error");
}
