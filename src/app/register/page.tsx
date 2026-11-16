"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui";
import { api } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
        }),
      });
      router.push("/student");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-grain grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <form onSubmit={onSubmit} className="card space-y-4 p-7">
          <div>
            <h1 className="text-xl font-bold text-forest-900">Create your student account</h1>
            <p className="text-sm text-forest-600">Vendors are onboarded by the canteen admin.</p>
          </div>
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} required minLength={2} onChange={set("name")} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} required onChange={set("email")} />
          </div>
          <div>
            <label className="label">Phone <span className="text-forest-400">(optional)</span></label>
            <input className="input" value={form.phone} pattern="[0-9]{10}" onChange={set("phone")}
              placeholder="10-digit mobile" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} required minLength={8}
              onChange={set("password")} placeholder="At least 8 characters" />
          </div>
          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
          <p className="text-center text-sm text-forest-600">
            Already have an account? <Link href="/login" className="font-semibold text-forest-800 underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
