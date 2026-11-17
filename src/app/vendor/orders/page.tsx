"use client";
import { useEffect, useState } from "react";
import { api, currency, dateTime, hhmm, shortDate } from "@/lib/client";
import { StatusBadge, Empty } from "@/components/ui";

type Order = {
  order_id: number; status: string; order_date: string; total_amount: number;
  payment_status: string; student_name: string; slot_date: string;
  start_time: string; end_time: string; special_instructions: string | null;
  item_count: number;
};

const FILTERS = ["ALL", "PLACED", "PREPARING", "READY", "COLLECTED", "CANCELLED"];
const NEXT: Record<string, { to: string; label: string }[]> = {
  PLACED:    [{ to: "PREPARING", label: "Accept & prepare" }, { to: "CANCELLED", label: "Reject" }],
  PREPARING: [{ to: "READY", label: "Mark ready" }, { to: "CANCELLED", label: "Cancel" }],
  READY:     [{ to: "COLLECTED", label: "Mark collected" }, { to: "CANCELLED", label: "Cancel" }],
};

export default function VendorOrdersPage() {
  const [filter, setFilter] = useState("ALL");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const qs = filter === "ALL" ? "" : `?status=${filter}`;
    setOrders(await api<Order[]>(`/api/vendor/orders${qs}`));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function advance(id: number, to: string) {
    if (to === "CANCELLED" && !confirm("Cancel this order? Stock and slot capacity will be restored.")) return;
    setBusy(id);
    try { await api(`/api/vendor/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: to }) }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-forest-900">Orders</h1>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === s ? "bg-forest-700 text-cream" : "bg-white text-forest-700 border border-forest-200"
            }`}>{s === "ALL" ? "All" : s}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-forest-500">Loading…</p>
      ) : orders.length === 0 ? (
        <Empty>No orders in this view.</Empty>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.order_id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-forest-900">
                    Order #{o.order_id} · {o.student_name}
                  </p>
                  <p className="text-sm text-forest-600">
                    {o.item_count} item(s) · {currency(o.total_amount)} · {dateTime(o.order_date)}
                  </p>
                  <p className="text-sm text-forest-600">
                    Pickup {shortDate(o.slot_date)} {hhmm(o.start_time)}–{hhmm(o.end_time)}
                  </p>
                  {o.special_instructions && (
                    <p className="mt-1 text-sm italic text-forest-500">“{o.special_instructions}”</p>
                  )}
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(NEXT[o.status] || []).map((a) => (
                  <button key={a.to}
                    className={a.to === "CANCELLED" ? "btn-outline" : "btn-primary"}
                    disabled={busy === o.order_id}
                    onClick={() => advance(o.order_id, a.to)}>{a.label}</button>
                ))}
                {!(NEXT[o.status]) && <span className="text-sm text-forest-400">No further action.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
