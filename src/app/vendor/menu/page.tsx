"use client";
import { useEffect, useState } from "react";
import { api, currency } from "@/lib/client";

type Food = {
  food_id: number; canteen_id: number; canteen_name: string; food_name: string;
  category: string; price: number; is_available: number;
  preparation_time: number | null; image_url: string | null; quantity_available: number;
};
type Canteen = { canteen_id: number; canteen_name: string };

export default function VendorMenuPage() {
  const [food, setFood] = useState<Food[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    const [f, c] = await Promise.all([
      api<Food[]>("/api/vendor/food"),
      api<Canteen[]>("/api/vendor/canteens"),
    ]);
    setFood(f); setCanteens(c); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateField(id: number, body: any) {
    setBusy(id);
    try { await api(`/api/vendor/food/${id}`, { method: "PATCH", body: JSON.stringify(body) }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  }
  async function updateStock(id: number, qty: number) {
    setBusy(id);
    try { await api(`/api/vendor/inventory/${id}`, { method: "PATCH", body: JSON.stringify({ quantity_available: qty }) }); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-forest-900">Menu &amp; stock</h1>
        <button className="btn-primary" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Close" : "+ Add item"}
        </button>
      </div>

      {showAdd && <AddItemForm canteens={canteens} onDone={() => { setShowAdd(false); load(); }} />}

      {loading ? (
        <p className="text-forest-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="border-b border-forest-100 text-left text-forest-500">
              <tr>
                <th className="p-3">Item</th><th className="p-3">Category</th>
                <th className="p-3">Price</th><th className="p-3">Stock</th>
                <th className="p-3">Available</th>
              </tr>
            </thead>
            <tbody>
              {food.map((f) => (
                <tr key={f.food_id} className="border-b border-forest-50">
                  <td className="p-3">
                    <p className="font-medium text-forest-900">{f.food_name}</p>
                    <p className="text-xs text-forest-400">{f.canteen_name}</p>
                  </td>
                  <td className="p-3 text-forest-600">{f.category}</td>
                  <td className="p-3">
                    <PriceEditor value={f.price} disabled={busy === f.food_id}
                      onSave={(p) => updateField(f.food_id, { price: p })} />
                  </td>
                  <td className="p-3">
                    <StockEditor value={f.quantity_available} disabled={busy === f.food_id}
                      onSave={(q) => updateStock(f.food_id, q)} />
                  </td>
                  <td className="p-3">
                    <button onClick={() => updateField(f.food_id, { is_available: !f.is_available })}
                      disabled={busy === f.food_id} title="Toggle availability">
                      <span className={`badge ${f.is_available ? "bg-forest-100 text-forest-800" : "bg-rose-100 text-rose-700"}`}>
                        {f.is_available ? "Available" : "Hidden"}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-forest-400">Tip: click a price or stock number to edit it, or the availability pill to toggle it.</p>
    </div>
  );
}

function PriceEditor({ value, onSave, disabled }: { value: number; onSave: (n: number) => void; disabled?: boolean }) {
  const [v, setV] = useState(String(value));
  const [edit, setEdit] = useState(false);
  if (!edit) return <button className="font-medium text-forest-800 underline-offset-2 hover:underline" onClick={() => setEdit(true)}>{currency(value)}</button>;
  return (
    <span className="flex items-center gap-1">
      <input className="input w-20 py-1" type="number" min={0} step="0.5" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn-primary px-2 py-1" disabled={disabled} onClick={() => { onSave(Number(v)); setEdit(false); }}>✓</button>
    </span>
  );
}

function StockEditor({ value, onSave, disabled }: { value: number; onSave: (n: number) => void; disabled?: boolean }) {
  const [v, setV] = useState(String(value));
  const [edit, setEdit] = useState(false);
  if (!edit) return (
    <button className={`font-semibold underline-offset-2 hover:underline ${value <= 5 ? "text-amber-700" : "text-forest-800"}`} onClick={() => setEdit(true)}>{value}</button>
  );
  return (
    <span className="flex items-center gap-1">
      <input className="input w-20 py-1" type="number" min={0} value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn-primary px-2 py-1" disabled={disabled} onClick={() => { onSave(Number(v)); setEdit(false); }}>✓</button>
    </span>
  );
}

function AddItemForm({ canteens, onDone }: { canteens: Canteen[]; onDone: () => void }) {
  const [f, setF] = useState({
    canteen_id: canteens[0]?.canteen_id ?? 0, food_name: "", category: "",
    price: "", preparation_time: "", image_url: "", initial_stock: "0",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setSaving(true);
    try {
      await api("/api/vendor/food", {
        method: "POST",
        body: JSON.stringify({
          canteen_id: Number(f.canteen_id),
          food_name: f.food_name,
          category: f.category,
          price: Number(f.price),
          is_available: true,
          preparation_time: f.preparation_time ? Number(f.preparation_time) : null,
          image_url: f.image_url || null,
          initial_stock: Number(f.initial_stock) || 0,
        }),
      });
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2">
      {err && <div className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div><label className="label">Canteen</label>
        <select className="input" value={f.canteen_id} onChange={set("canteen_id")}>
          {canteens.map((c) => <option key={c.canteen_id} value={c.canteen_id}>{c.canteen_name}</option>)}
        </select></div>
      <div><label className="label">Name</label><input className="input" required value={f.food_name} onChange={set("food_name")} /></div>
      <div><label className="label">Category</label><input className="input" required value={f.category} onChange={set("category")} placeholder="e.g. Beverage" /></div>
      <div><label className="label">Price (₹)</label><input className="input" type="number" min={0} step="0.5" required value={f.price} onChange={set("price")} /></div>
      <div><label className="label">Prep time (min)</label><input className="input" type="number" min={0} value={f.preparation_time} onChange={set("preparation_time")} /></div>
      <div><label className="label">Initial stock</label><input className="input" type="number" min={0} value={f.initial_stock} onChange={set("initial_stock")} /></div>
      <div className="sm:col-span-2"><label className="label">Image URL (optional)</label><input className="input" value={f.image_url} onChange={set("image_url")} placeholder="https://…" /></div>
      <div className="sm:col-span-2"><button className="btn-primary" disabled={saving}>{saving ? "Adding…" : "Add item"}</button></div>
    </form>
  );
}
