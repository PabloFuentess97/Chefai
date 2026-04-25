"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type Props = {
  email: string;
  name: string | null;
  planName: string;
  role: Role;
  brand: React.ReactNode;
};

export function Topbar({ email, name, planName, brand }: Props) {
  const initials = (name ?? email)
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header
      className="h-14 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="lg:hidden">{brand}</div>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
          {planName}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          render={
            <Link href="/settings" aria-label="Tu cuenta">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">
                  {initials || "ME"}
                </AvatarFallback>
              </Avatar>
            </Link>
          }
        />
      </div>
    </header>
  );
}
