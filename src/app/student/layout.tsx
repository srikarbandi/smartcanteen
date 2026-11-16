import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = getSession();
  if (!user) redirect("/login");
  if (user.role === "VENDOR") redirect("/vendor");

  return (
    <div className="min-h-screen bg-grain">
      <NavBar
        name={user.name}
        links={[
          { href: "/student", label: "Dashboard" },
          { href: "/student/menu", label: "Order food" },
          { href: "/student/orders", label: "My orders" },
        ]}
      />
      <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
    </div>
  );
}
