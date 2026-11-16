"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, currency, shortDate, hhmm, dateTime } from "@/lib/client";
import { StatusBadge, Empty } from "@/components/ui";

type Order = {
  order_id: number; canteen_name: string; order_date: string; status: string;
  payment_status: string; total_amount: number; slot_date: string;
  start_time: string; end_time: string; item_count: number;
};

const FLOW = ["PLACED", "PREPARING", "READY", "COLLECTED"];

export default function OrdersPage() {
  const placed = useSearchParams().get("placed");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [rating, setRating] = useState<Record<number, { rating: number; comment: string }>>({});

  async function load() {
    setLoading(true);
    try {
      setOrders(await api<Order[]>("/api/orders"));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    if (!confirm("Cancel this order? Inventory and your pickup slot will be released.")) return;
    setBusy(id);
    try { await api(`/api/orders/${id}/cancel`, { method: "POST" }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  }

  async function submitFeedback(id: number) {
    const r = rating[id];
    if (!r?.rating) return;
    setBusy(id);
    try {
      await api("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ order_id: id, rating: r.rating, comment: r.comment || undefined }),
      });
      alert("Thanks for your feedback!");
      setRating((x) => ({ ...x, [id]: { rating: 0, comment: "" } }));
    } catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-forest-900">My orders</h1>
      {placed && (
        <div className="rounded-lg bg-forest-100 px-4 py-3 text-sm text-forest-800">
          ✅ Order #{placed} placed! Track its status below.
        </div>
      )}
      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      {loading ? (
        <p className="text-forest-500">Loading…</p>
      ) : orders.length === 0 ? (
        <Empty>You haven&apos;t placed any orders yet.</Empty>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const step = FLOW.indexOf(o.status);
            const canCancel = ["PLACED", "PREPARING", "READY"].includes(o.status);
            const canRate = o.status === "COLLECTED";
            return (
              <div key={o.order_id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-forest-900">
                      {o.canteen_name} · Order #{o.order_id}
                    </p>
                    <p className="text-sm text-forest-600">
                      {o.item_count} item(s) · {currency(o.total_amount)} · placed {dateTime(o.order_date)}
                    </p>
                    <p className="text-sm text-forest-600">
                      Pickup {shortDate(o.slot_date)} at {hhmm(o.start_time)}–{hhmm(o.end_time)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={o.status} />
                    <StatusBadge status={o.payment_status} />
                  </div>
                </div>

                {/* progress tracker */}
                {o.status !== "CANCELLED" ? (
                  <div className="mt-4 flex items-center">
                    {FLOW.map((s, i) => (
                      <div key={s} className="flex flex-1 items-center last:flex-none">
                        <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                          i <= step ? "bg-forest-700 text-cream" : "bg-forest-100 text-forest-400"
                        }`}>{i + 1}</div>
                        {i < FLOW.length - 1 && (
                          <div className={`h-0.5 flex-1 ${i < step ? "bg-forest-700" : "bg-forest-100"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-rose-600">Order cancelled.</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {canCancel && (
                    <button className="btn-outline" disabled={busy === o.order_id}
                      onClick={() => cancel(o.order_id)}>Cancel order</button>
                  )}
                </div>

                {/* feedback */}
                {canRate && (
                  <div className="mt-4 rounded-lg border border-forest-100 bg-forest-50/50 p-3">
                    <p className="text-sm font-medium text-forest-800">Rate this order</p>
                    <div className="mt-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() =>
                          setRating((x) => ({ ...x, [o.order_id]: { rating: n, comment: x[o.order_id]?.comment || "" } }))}
                          className={`text-2xl ${(rating[o.order_id]?.rating || 0) >= n ? "text-amber-500" : "text-forest-200"}`}>★</button>
                      ))}
                    </div>
                    <textarea className="input mt-2" rows={2} placeholder="Optional comment"
                      value={rating[o.order_id]?.comment || ""}
                      onChange={(e) => setRating((x) => ({ ...x, [o.order_id]: { rating: x[o.order_id]?.rating || 0, comment: e.target.value } }))} />
                    <button className="btn-primary mt-2" disabled={busy === o.order_id || !(rating[o.order_id]?.rating)}
                      onClick={() => submitFeedback(o.order_id)}>Submit feedback</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
