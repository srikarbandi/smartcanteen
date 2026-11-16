import Link from "next/link";
import { Brand } from "@/components/ui";
import { getSession } from "@/lib/auth";

export default function LandingPage() {
  const user = getSession();
  const dash = user?.role === "VENDOR" ? "/vendor" : "/student";

  return (
    <div className="bg-grain min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Brand />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href={dash} className="btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Log in</Link>
              <Link href="/register" className="btn-primary">Sign up</Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-2">
          <div>
            <span className="badge bg-forest-100 text-forest-700">PES University · Campus dining</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-forest-900 md:text-5xl">
              Skip the lunch-hour queue.
            </h1>
            <p className="mt-4 text-lg text-forest-700">
              Pre-order your meal, reserve a pickup slot, and collect it when it&apos;s ready.
              SmartCanteen keeps inventory, capacity and order records consistent with real
              database transactions — no overbooking, no overselling.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">Order a meal</Link>
              <Link href="/login" className="btn-outline px-6 py-3 text-base">Vendor login</Link>
            </div>
            <div className="mt-6 rounded-lg border border-forest-100 bg-white/70 p-4 text-sm text-forest-600">
              <p className="font-semibold text-forest-800">Demo accounts (password <code>Smart@123</code>):</p>
              <p className="mt-1">Student · <code>student1@smartcanteen.test</code></p>
              <p>Vendor · <code>vendor1@smartcanteen.test</code></p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-forest-500">How it works</h3>
            <ol className="mt-4 space-y-4">
              {[
                ["Browse & search", "See live menus, prices and availability across campus canteens."],
                ["Reserve a slot", "Pick a 30-minute pickup window with guaranteed capacity."],
                ["Order in one transaction", "Inventory is deducted and your slot reserved atomically."],
                ["Track to pickup", "Watch status go Placed → Preparing → Ready → Collected."],
              ].map(([t, d], i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest-700 text-sm font-bold text-cream">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-forest-900">{t}</p>
                    <p className="text-sm text-forest-600">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <footer className="border-t border-forest-100 py-8 text-center text-sm text-forest-500">
          SmartCanteen · DBMS Experiential Learning Level 3 · Sreekar Bandi &amp; Soha Rafiq
        </footer>
      </main>
    </div>
  );
}
