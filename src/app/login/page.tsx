"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui";
import { api } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api<{ role: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(user.role === "VENDOR" ? "/vendor" : "/student");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-grain grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Brand /></div>
        <form onSubmit={onSubmit} className="card space-y-4 p-7">
          <div>
            <h1 className="text-xl font-bold text-forest-900">Welcome back</h1>
            <p className="text-sm text-forest-600">Log in to order or manage your canteen.</p>
          </div>
          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} placeholder="you@pes.edu" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
          <p className="text-center text-sm text-forest-600">
            New here? <Link href="/register" className="font-semibold text-forest-800 underline">Create a student account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
