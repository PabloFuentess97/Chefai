"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="destructive"
        size="lg"
        className="w-full sm:w-auto"
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </form>
  );
}
