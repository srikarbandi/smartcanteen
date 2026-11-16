// Small shared presentational components.
import Link from "next/link";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLACED: "bg-forest-100 text-forest-800",
    PREPARING: "bg-amber-100 text-amber-800",
    READY: "bg-blue-100 text-blue-800",
    COLLECTED: "bg-forest-700 text-cream",
    CANCELLED: "bg-rose-100 text-rose-700",
    PENDING: "bg-gray-100 text-gray-700",
    PAID: "bg-forest-100 text-forest-800",
    REFUNDED: "bg-rose-100 text-rose-700",
    FAILED: "bg-rose-100 text-rose-700",
  };
  return <span className={`badge ${map[status] ?? "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-forest-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-forest-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-forest-400">{hint}</div>}
    </div>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold text-forest-800">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest-700 text-cream">🍃</span>
      <span className="text-lg">SmartCanteen</span>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card grid place-items-center p-10 text-center text-sm text-forest-500">
      {children}
    </div>
  );
}
