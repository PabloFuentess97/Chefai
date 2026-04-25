"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Sparkles,
  CreditCard,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
};

const TABS: Tab[] = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/recipes", label: "Recetas", icon: BookOpen },
  { href: "/generate", label: "Generar", icon: Sparkles, highlight: true },
  { href: "/billing", label: "Plan", icon: CreditCard },
  { href: "/settings", label: "Cuenta", icon: User },
];

export function MobileNav({ role: _role }: { role: Role }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/65"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 max-w-xl mx-auto">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;

          if (tab.highlight) {
            return (
              <li key={tab.href} className="flex justify-center">
                <Link
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mt-6 size-14 grid place-items-center rounded-full bg-primary text-primary-foreground",
                    "shadow-lg shadow-primary/30 transition-transform active:scale-95",
                    active && "ring-4 ring-primary/25"
                  )}
                >
                  <Icon className="size-6" />
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 px-1",
                  "transition-colors active:bg-muted/50 select-none",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium leading-tight tracking-wide">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
