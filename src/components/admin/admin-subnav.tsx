"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Palette,
  Megaphone,
  Mail,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon };

const TABS: Tab[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/plans", label: "Planes", icon: Package },
  { href: "/admin/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/emails", label: "Emails", icon: Mail },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/branding", label: "Branding", icon: Palette },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de admin"
      className="-mx-4 md:-mx-6 px-4 md:px-6 mb-4 sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/60 supports-[backdrop-filter]:bg-background/65"
    >
      <ul className="flex gap-1.5 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" strokeWidth={active ? 2.4 : 1.8} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
