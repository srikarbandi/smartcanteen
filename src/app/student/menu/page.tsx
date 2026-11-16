"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, currency, hhmm } from "@/lib/client";

type Canteen = { canteen_id: number; canteen_name: string; location: string };
type Food = {
  food_id: number; canteen_id: number; food_name: string; category: string;
  price: number; is_available: number; preparation_time: number | null;
  image_url: string | null; quantity_available: number;
};
type Slot = {
  slot_id: number; slot_date: string; start_time: string; end_time: string;
  capacity: number; available_count: number;
};

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  // Local date (NOT toISOString, which is UTC and can be a day off near midnight).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OrderPage() {
  const router = useRouter();
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [canteenId, setCanteenId] = useState<number | null>(null);
  const [items, setItems] = useState<Food[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  // Load canteens once.
  useEffect(() => {
    api<Canteen[]>("/api/canteens").then((c) => {
      setCanteens(c);
      if (c[0]) setCanteenId(c[0].canteen_id);
    }).catch((e) => setMsg({ type: "err", text: e.message }));
  }, []);

  // Load menu when canteen changes (and reset cart).
  useEffect(() => {
    if (!canteenId) return;
    setCart({});
    setActiveCat("All");
    api<{ items: Food[]; categories: { category: string }[] }>(
      `/api/menu?canteen_id=${canteenId}&available=1`
    ).then((d) => {
      setItems(d.items);
      setCategories(d.categories.map((c) => c.category));
    }).catch((e) => setMsg({ type: "err", text: e.message }));
  }, [canteenId]);

  // Load slots when canteen or date changes.
  useEffect(() => {
    if (!canteenId) return;
    setSlotId(null);
    api<Slot[]>(`/api/slots?canteen_id=${canteenId}&date=${date}`)
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [canteenId, date]);

  const visible = useMemo(() => items.filter((f) =>
    (activeCat === "All" || f.category === activeCat) &&
    (!search || f.food_name.toLowerCase().includes(search.toLowerCase()))
  ), [items, activeCat, search]);

  const cartLines = useMemo(() =>
    Object.entries(cart).map(([id, qty]) => {
      const food = items.find((f) => f.food_id === Number(id))!;
      return { food, qty };
    }).filter((l) => l.food && l.qty > 0),
  [cart, items]);

  const total = cartLines.reduce((s, l) => s + l.food.price * l.qty, 0);

  function setQty(food: Food, qty: number) {
    const capped = Math.max(0, Math.min(qty, food.quantity_available));
    setCart((c) => ({ ...c, [food.food_id]: capped }));
  }

  async function placeOrder() {
    if (!canteenId || !slotId || cartLines.length === 0) return;
    setPlacing(true);
    setMsg(null);
    try {
      const res = await api<{ order_id: number; total_amount: number }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          canteen_id: canteenId,
          slot_id: slotId,
          items: cartLines.map((l) => ({ food_id: l.food.food_id, quantity: l.qty })),
          special_instructions: note || undefined,
        }),
      });
      router.push(`/student/orders?placed=${res.order_id}`);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Menu column */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-forest-900">Order food</h1>
          <select
            className="input max-w-xs"
            value={canteenId ?? ""}
            onChange={(e) => setCanteenId(Number(e.target.value))}
          >
            {canteens.map((c) => (
              <option key={c.canteen_id} value={c.canteen_id}>{c.canteen_name} · {c.location}</option>
            ))}
          </select>
        </div>

        {msg?.type === "err" && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg.text}</div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs" placeholder="Search dishes…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <div className="flex flex-wrap gap-1">
            {["All", ...categories].map((c) => (
              <button key={c} onClick={() => setActiveCat(c)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  activeCat === c ? "bg-forest-700 text-cream" : "bg-white text-forest-700 border border-forest-200"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((f) => (
            <div key={f.food_id} className="card overflow-hidden">
              {f.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.image_url} alt={f.food_name} className="h-32 w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-forest-900">{f.food_name}</p>
                    <p className="text-xs text-forest-500">{f.category}
                      {f.preparation_time ? ` · ${f.preparation_time} min` : ""}</p>
                  </div>
                  <span className="font-bold text-forest-800">{currency(f.price)}</span>
                </div>
                <p className={`mt-2 text-xs ${f.quantity_available <= 5 ? "text-amber-700" : "text-forest-500"}`}>
                  {f.quantity_available > 0 ? `${f.quantity_available} left` : "Out of stock"}
                </p>
                <div className="mt-3">
                  {cart[f.food_id] ? (
                    <div className="flex items-center gap-2">
                      <button className="btn-outline h-8 w-8 p-0" onClick={() => setQty(f, (cart[f.food_id] || 0) - 1)}>−</button>
                      <span className="w-8 text-center font-semibold">{cart[f.food_id]}</span>
                      <button className="btn-outline h-8 w-8 p-0" onClick={() => setQty(f, (cart[f.food_id] || 0) + 1)}
                        disabled={cart[f.food_id] >= f.quantity_available}>+</button>
                    </div>
                  ) : (
                    <button className="btn-primary w-full" disabled={f.quantity_available === 0}
                      onClick={() => setQty(f, 1)}>Add</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-forest-500">No items match your filters.</p>
          )}
        </div>
      </div>

      {/* Cart / checkout column */}
      <aside className="lg:sticky lg:top-24 h-fit space-y-4">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-forest-900">Your cart</h2>
          {cartLines.length === 0 ? (
            <p className="mt-3 text-sm text-forest-500">Add items to get started.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {cartLines.map((l) => (
                <li key={l.food.food_id} className="flex justify-between text-sm">
                  <span className="text-forest-700">{l.qty} × {l.food.food_name}</span>
                  <span className="font-medium">{currency(l.food.price * l.qty)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-forest-100 pt-3">
            <label className="label">Pickup date</label>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setDate(todayISO())}
                className={`rounded-lg px-3 py-1.5 text-sm ${date === todayISO() ? "bg-forest-700 text-cream" : "border border-forest-200 bg-white"}`}>Today</button>
              <button onClick={() => setDate(todayISO(1))}
                className={`rounded-lg px-3 py-1.5 text-sm ${date === todayISO(1) ? "bg-forest-700 text-cream" : "border border-forest-200 bg-white"}`}>Tomorrow</button>
            </div>
            <label className="label">Pickup slot</label>
            {slots.length === 0 ? (
              <p className="text-sm text-forest-500">No slots with capacity for this date.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((s) => (
                  <button key={s.slot_id} onClick={() => setSlotId(s.slot_id)}
                    className={`rounded-lg border px-2 py-1.5 text-xs ${
                      slotId === s.slot_id ? "border-forest-600 bg-forest-50 font-semibold" : "border-forest-200 bg-white"
                    }`}>
                    {hhmm(s.start_time)}–{hhmm(s.end_time)}
                    <span className="block text-forest-400">{s.available_count} left</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="label">Special instructions</label>
            <textarea className="input" rows={2} value={note} maxLength={500}
              onChange={(e) => setNote(e.target.value)} placeholder="e.g. less spicy" />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-forest-100 pt-3">
            <span className="text-forest-600">Total</span>
            <span className="text-xl font-bold text-forest-900">{currency(total)}</span>
          </div>
          <button className="btn-primary mt-3 w-full py-2.5"
            disabled={placing || !slotId || cartLines.length === 0}
            onClick={placeOrder}>
            {placing ? "Placing…" : "Place order"}
          </button>
          {!slotId && cartLines.length > 0 && (
            <p className="mt-2 text-center text-xs text-amber-700">Select a pickup slot to continue.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
