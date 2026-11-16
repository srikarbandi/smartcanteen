"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brand } from "@/components/ui";
import { api } from "@/lib/client";

export function NavBar({
  name,
  links,
}: {
  name: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-forest-100 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-6">
          <Brand href={links[0]?.href || "/"} />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-forest-700 text-cream" : "text-forest-700 hover:bg-forest-50"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-forest-600 sm:inline">Hi, {name.split(" ")[0]}</span>
          <button onClick={logout} className="btn-outline py-1.5">Log out</button>
        </div>
      </div>
      {/* mobile nav */}
      <nav className="flex gap-1 overflow-x-auto px-5 pb-2 md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              pathname === l.href ? "bg-forest-700 text-cream" : "text-forest-700"
            }`}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
