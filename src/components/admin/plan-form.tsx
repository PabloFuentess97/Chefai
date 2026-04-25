"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Plan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertPlanAction } from "@/actions/admin";

type Props = { plan?: Plan; onDone?: () => void };

export function PlanForm({ plan, onDone }: Props) {
  const [pending, start] = React.useTransition();
  const [interval, setInterval] = React.useState<"MONTH" | "YEAR">(
    (plan?.interval as "MONTH" | "YEAR") ?? "MONTH"
  );
  const [imageQuality, setImageQuality] = React.useState(
    plan?.imageQuality ?? "low"
  );

  function onSubmit(fd: FormData) {
    start(async () => {
      fd.set("interval", interval);
      fd.set("imageQuality", imageQuality);
      const res = await upsertPlanAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Plan guardado");
      onDone?.();
    });
  }

  return (
    <form action={onSubmit} className="grid gap-4 md:grid-cols-2">
      {plan?.id && <input type="hidden" name="id" value={plan.id} />}

      <Field label="Slug" htmlFor="slug">
        <Input
          id="slug"
          name="slug"
          defaultValue={plan?.slug}
          required
          pattern="[a-z0-9-]+"
        />
      </Field>
      <Field label="Nombre" htmlFor="name">
        <Input id="name" name="name" defaultValue={plan?.name} required />
      </Field>
      <Field label="Descripción" htmlFor="description" full>
        <Textarea
          id="description"
          name="description"
          defaultValue={plan?.description ?? ""}
          rows={2}
        />
      </Field>
      <Field label="Precio (céntimos)" htmlFor="priceCents">
        <Input
          id="priceCents"
          name="priceCents"
          type="number"
          min={0}
          defaultValue={plan?.priceCents ?? 0}
          required
        />
      </Field>
      <Field label="Moneda" htmlFor="currency">
        <Input
          id="currency"
          name="currency"
          defaultValue={plan?.currency ?? "EUR"}
          maxLength={3}
        />
      </Field>
      <Field label="Periodo" htmlFor="interval">
        <Select
          value={interval}
          onValueChange={(v) => v && setInterval(v as "MONTH" | "YEAR")}
        >
          <SelectTrigger id="interval">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MONTH">Mensual</SelectItem>
            <SelectItem value="YEAR">Anual</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Recetas/mes (-1 ilimitado)" htmlFor="recipesPerMonth">
        <Input
          id="recipesPerMonth"
          name="recipesPerMonth"
          type="number"
          defaultValue={plan?.recipesPerMonth ?? 3}
          required
        />
      </Field>
      <Field label="Calidad imagen" htmlFor="imageQuality">
        <Select value={imageQuality} onValueChange={(v) => setImageQuality(v ?? "low")}>
          <SelectTrigger id="imageQuality">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="hd">HD</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Stripe Price ID" htmlFor="stripePriceId">
        <Input
          id="stripePriceId"
          name="stripePriceId"
          defaultValue={plan?.stripePriceId ?? ""}
          placeholder="price_..."
        />
      </Field>
      <Field label="PayPal Plan ID" htmlFor="paypalPlanId">
        <Input
          id="paypalPlanId"
          name="paypalPlanId"
          defaultValue={plan?.paypalPlanId ?? ""}
        />
      </Field>
      <Field label="Orden" htmlFor="sortOrder">
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          defaultValue={plan?.sortOrder ?? 0}
        />
      </Field>
      <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border p-4">
        <Toggle name="imagesEnabled" label="Imágenes" defaultChecked={plan?.imagesEnabled} />
        <Toggle name="pdfExport" label="PDF" defaultChecked={plan?.pdfExport} />
        <Toggle name="shoppingList" label="Lista compra" defaultChecked={plan?.shoppingList} />
        <Toggle name="mealPlanner" label="Menús" defaultChecked={plan?.mealPlanner} />
        <Toggle name="weeklyPlanner" label="Menú semanal" defaultChecked={plan?.weeklyPlanner} />
        <Toggle name="prioritySupport" label="Soporte" defaultChecked={plan?.prioritySupport} />
        <Toggle name="isActive" label="Activo" defaultChecked={plan?.isActive ?? true} />
        <Toggle name="isPublic" label="Público" defaultChecked={plan?.isPublic ?? true} />
      </div>
      <div className="md:col-span-2 flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : plan?.id ? "Guardar cambios" : "Crear plan"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  full,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = React.useState(!!defaultChecked);
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={(v) => setChecked(Boolean(v))}
      />
      <input
        type="hidden"
        name={name}
        value={checked ? "on" : ""}
      />
    </label>
  );
}
