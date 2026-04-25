"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/actions/settings";

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string | null;
  email: string;
}) {
  const [pending, start] = React.useTransition();

  function onSubmit(fd: FormData) {
    start(async () => {
      const res = await updateProfileAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Perfil actualizado");
    });
  }

  return (
    <form action={onSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">
          El email no se puede cambiar todavía.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName ?? ""}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
