import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getStudentDashboard } from "@/lib/data";
import { Stat, StatusBadge, Empty } from "@/components/ui";
import { currency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = getSession()!;
  const d = await getStudentDashboard(user.user_id);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Your dashboard</h1>
          <p className="text-forest-600">Welcome back, {user.name.split(" ")[0]}.</p>
        </div>
        <Link href="/student/menu" className="btn-primary">Order a meal</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active orders" value={d.activeOrders} hint="Placed, preparing or ready" />
        <Stat label="Past orders" value={d.pastOrders} hint="Collected or cancelled" />
        <Stat label="Lifetime spend" value={currency(d.lifetimeSpend)} hint="Excludes cancelled" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-forest-900">Upcoming pickups</h2>
        {d.upcoming.length === 0 ? (
          <Empty>No upcoming pickups. <Link href="/student/menu" className="ml-1 font-semibold underline">Order now →</Link></Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d.upcoming.map((o: any) => (
              <Link key={o.order_id} href="/student/orders" className="card flex items-center justify-between p-4 hover:border-forest-300">
                <div>
                  <p className="font-semibold text-forest-900">{o.canteen_name}</p>
                  <p className="text-sm text-forest-600">
                    {new Date(o.slot_date).toLocaleDateString()} · {String(o.start_time).slice(0, 5)}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
