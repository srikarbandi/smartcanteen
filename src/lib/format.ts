// Formatting helpers usable from both server and client components.
export const currency = (n: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n) || 0);

export const hhmm = (t: string | null | undefined) => (t ? String(t).slice(0, 5) : "");

export const shortDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export const dateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
