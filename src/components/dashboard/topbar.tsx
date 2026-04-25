"use client";

import Link from "next/link";
import { LogOut, User as UserIcon, CreditCard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

type Props = {
  email: string;
  name: string | null;
  planName: string;
};

export function Topbar({ email, name, planName }: Props) {
  const initials = (name ?? email)
    .split(/[ @._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="lg:hidden">
        <Link href="/dashboard" className="font-semibold">
          ChefAI
        </Link>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <span className="hidden md:inline text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
          Plan {planName}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback>{initials || "ME"}</AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium truncate">
                  {name ?? "Tu cuenta"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <UserIcon className="size-4" />
              Ajustes
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/billing" />}>
              <CreditCard className="size-4" />
              Facturación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
