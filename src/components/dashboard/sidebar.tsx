"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  BookMarked,
  CreditCard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/generate", label: "Generar", icon: Sparkles },
  { href: "/recipes", label: "Mis recetas", icon: BookOpen },
  { href: "/cookbook", label: "Mi recetario", icon: BookMarked },
  { href: "/billing", label: "Facturación", icon: CreditCard },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar({
  role,
  brand,
}: {
  role: Role;
  brand: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r bg-sidebar">
      <div className="px-6 py-5 border-b">{brand}</div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
        {role === "ADMIN" && (
          <>
            <div className="my-3 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
              Admin
            </div>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldCheck className="size-4" />
              Panel admin
            </Link>
          </>
        )}
      </nav>
      <div className="px-6 py-4 text-xs text-muted-foreground border-t">
        v0.1.0 · MVP
      </div>
    </aside>
  );
}
