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
      <div className="md:col-span-2 space-y-4">
        <FeatureGroup
          title="Funciones IA"
          subtitle="Las que cuestan tokens reales en cada uso"
        >
          <Toggle
            name="imagesEnabled"
            label="Imágenes en recetas"
            description="Generar foto IA por receta"
            defaultChecked={plan?.imagesEnabled}
          />
          <Toggle
            name="fridgePhoto"
            label="Foto de la nevera"
            description="Detectar ingredientes con visión IA"
            defaultChecked={plan?.fridgePhoto}
          />
          <Toggle
            name="substitutions"
            label="Sustitutos IA"
            description="Sugerencias de ingredientes alternativos"
            defaultChecked={plan?.substitutions}
          />
        </FeatureGroup>

        <FeatureGroup
          title="Planificación y compra"
          subtitle="Organiza la semana"
        >
          <Toggle
            name="mealPlanner"
            label="Menús"
            description="Crear menús diarios"
            defaultChecked={plan?.mealPlanner}
          />
          <Toggle
            name="weeklyPlanner"
            label="Menú semanal"
            description="7 días × 4 platos"
            defaultChecked={plan?.weeklyPlanner}
          />
          <Toggle
            name="shoppingList"
            label="Lista de la compra"
            description="Auto-genera y deduplica"
            defaultChecked={plan?.shoppingList}
          />
        </FeatureGroup>

        <FeatureGroup
          title="Cocina y exports"
          subtitle="Cómo usan las recetas"
        >
          <Toggle
            name="voiceCooking"
            label="Cocina por voz"
            description="Modo paso a paso con TTS y timer"
            defaultChecked={plan?.voiceCooking}
          />
          <Toggle
            name="pdfExport"
            label="PDF receta individual"
            description="Descarga una receta en PDF"
            defaultChecked={plan?.pdfExport}
          />
          <Toggle
            name="cookbookExport"
            label="Recetario PDF"
            description="Cookbook tipo revista con favoritas"
            defaultChecked={plan?.cookbookExport}
          />
        </FeatureGroup>

        <FeatureGroup title="Otros" subtitle="Soporte y visibilidad">
          <Toggle
            name="prioritySupport"
            label="Soporte prioritario"
            description="Respuesta < 24h"
            defaultChecked={plan?.prioritySupport}
          />
          <Toggle
            name="isActive"
            label="Activo"
            description="Si OFF, oculto a todos"
            defaultChecked={plan?.isActive ?? true}
          />
          <Toggle
            name="isPublic"
            label="Público"
            description="Si OFF, no aparece en /pricing"
            defaultChecked={plan?.isPublic ?? true}
          />
        </FeatureGroup>
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

function FeatureGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3">
        <p className="font-semibold text-sm">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = React.useState(!!defaultChecked);
  return (
    <label className="flex items-start gap-3 rounded-lg border bg-background p-3 cursor-pointer hover:bg-muted/30 transition">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(v) => setChecked(Boolean(v))}
        className="shrink-0 mt-0.5"
      />
      <input type="hidden" name={name} value={checked ? "on" : ""} />
    </label>
  );
}
