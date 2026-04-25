"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import type { Plan } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setUserRoleAction,
  updateUserNameAction,
  setUserPlanAction,
  cancelUserSubscriptionAction,
} from "@/actions/admin";

type Props = {
  userId: string;
  currentName: string | null;
  currentRole: Role;
  currentPlanSlug: string;
  hasActiveSubscription: boolean;
  plans: Plan[];
};

export function UserControls({
  userId,
  currentName,
  currentRole,
  currentPlanSlug,
  hasActiveSubscription,
  plans,
}: Props) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  // Name
  const [name, setName] = React.useState(currentName ?? "");
  function saveName() {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("name", name);
    start(async () => {
      const res = await updateUserNameAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Nombre actualizado");
      router.refresh();
    });
  }

  // Role
  function changeRole(role: Role) {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    start(async () => {
      const res = await setUserRoleAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Rol cambiado a ${role}`);
      router.refresh();
    });
  }

  // Plan
  const [planSlug, setPlanSlug] = React.useState(currentPlanSlug);
  const [periodMonths, setPeriodMonths] = React.useState(12);
  function savePlan() {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("planSlug", planSlug);
    fd.set("periodMonths", String(periodMonths));
    start(async () => {
      const res = await setUserPlanAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Plan asignado: ${res.data.planSlug}`);
      router.refresh();
    });
  }

  function cancelSub() {
    if (!confirm("¿Cancelar la suscripción de este usuario?")) return;
    start(async () => {
      const res = await cancelUserSubscriptionAction(userId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Suscripción cancelada");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="user-name">Nombre</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="user-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md"
            maxLength={80}
          />
          <Button onClick={saveName} disabled={pending}>
            Guardar nombre
          </Button>
        </div>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label>Rol</Label>
        <Select
          value={currentRole}
          onValueChange={(v) => v && changeRole(v as Role)}
        >
          <SelectTrigger className="max-w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USER">USER</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plan */}
      <div className="space-y-3">
        <Label>Plan</Label>
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
          <Select
            value={planSlug}
            onValueChange={(v) => v && setPlanSlug(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((p) => (
                <SelectItem key={p.id} value={p.slug}>
                  {p.name}
                  {p.priceCents === 0 ? " (Free)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Duración (meses)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={periodMonths}
              onChange={(e) =>
                setPeriodMonths(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              className="max-w-[100px]"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-2xl">
          Asignar Free elimina la suscripción actual (vuelve al plan gratuito
          implícito). Asignar Pro/Chef crea una suscripción manual sin pasar
          por Stripe ni PayPal.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={savePlan} disabled={pending}>
            {pending ? "Guardando…" : "Asignar plan"}
          </Button>
          {hasActiveSubscription && (
            <Button
              variant="destructive"
              onClick={cancelSub}
              disabled={pending}
            >
              Cancelar suscripción
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
