import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getVendorDashboard } from "@/lib/data";
import { Stat, Empty } from "@/components/ui";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VendorDashboard() {
  const user = getSession()!;
  const d = await getVendorDashboard(user.user_id);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Vendor dashboard</h1>
          <p className="text-forest-600">Today at a glance.</p>
        </div>
        <Link href="/vendor/orders" className="btn-primary">View orders</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders today" value={d.ordersToday} />
        <Stat label="Sales today" value={currency(d.salesToday)} />
        <Stat label="Pending (new)" value={d.pendingOrders} hint="Awaiting acceptance" />
        <Stat label="Preparing" value={d.preparingOrders} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-forest-900">Customer satisfaction</h2>
          {d.feedbackCount > 0 ? (
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-forest-900">{d.avgRating?.toFixed(2)}</span>
              <span className="text-amber-500 text-xl">★</span>
              <span className="text-sm text-forest-500">from {d.feedbackCount} rating(s)</span>
            </div>
          ) : (
            <p className="text-sm text-forest-500">No feedback yet.</p>
          )}
          <Link href="/vendor/feedback" className="mt-3 inline-block text-sm font-semibold text-forest-700 underline">
            See analytics →
          </Link>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-forest-900">Low-stock alerts</h2>
          {d.lowStock.length === 0 ? (
            <p className="text-sm text-forest-500">All items are well stocked.</p>
          ) : (
            <ul className="space-y-2">
              {d.lowStock.map((s: any) => (
                <li key={s.food_id} className="flex justify-between text-sm">
                  <span className="text-forest-800">{s.food_name}</span>
                  <span className={`font-semibold ${s.quantity_available === 0 ? "text-rose-600" : "text-amber-700"}`}>
                    {s.quantity_available} left
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/vendor/menu" className="mt-3 inline-block text-sm font-semibold text-forest-700 underline">
            Manage stock →
          </Link>
        </section>
      </div>
    </div>
  );
}
