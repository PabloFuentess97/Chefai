"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertCampaignAction,
  deleteCampaignAction,
} from "@/actions/admin";

type Plan = {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  interval: string;
};

type Campaign = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  heroBadge: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  ctaLabel: string | null;
  bulletList: string | null;
  customHtml: string | null;
  trialDays: number;
  trialRecipesPerDay: number;
  targetPlanId: string;
  isActive: boolean;
  // Server -> client serialization turns Date into string; accept both.
  expiresAt: Date | string | null;
};

export function CampaignForm({
  plans,
  campaign,
}: {
  plans: Plan[];
  campaign?: Campaign;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [deleting, startDelete] = React.useTransition();
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  function onSubmit(fd: FormData) {
    start(async () => {
      const res = await upsertCampaignAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Campaña guardada");
      router.push(`/admin/campaigns/${res.data.id}`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!campaign) return;
    if (!confirm("¿Eliminar esta campaña? Los usuarios ya creados se mantienen.")) {
      return;
    }
    startDelete(async () => {
      const res = await deleteCampaignAction(campaign.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Campaña eliminada");
      router.push("/admin/campaigns");
      router.refresh();
    });
  }

  const expiresValue = campaign?.expiresAt
    ? new Date(campaign.expiresAt).toISOString().slice(0, 10)
    : "";

  return (
    <form action={onSubmit} className="space-y-8">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}

      {/* Section: identidad */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Identidad
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre interno</Label>
            <Input
              id="name"
              name="name"
              defaultValue={campaign?.name ?? ""}
              required
              maxLength={80}
              placeholder="Black Friday 2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={campaign?.slug ?? ""}
              required
              maxLength={40}
              placeholder="7dias-gratis"
              pattern="[a-z0-9-]+"
            />
            <p className="text-[11px] text-muted-foreground">
              La landing estará en{" "}
              <code className="bg-muted px-1 rounded">/r/{"<slug>"}</code>
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción interna (opcional)</Label>
          <textarea
            id="description"
            name="description"
            defaultValue={campaign?.description ?? ""}
            maxLength={500}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Para qué es esta campaña, dónde se promociona…"
          />
        </div>
      </fieldset>

      {/* Section: trial */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Trial
        </legend>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trialDays">Días gratis</Label>
            <Input
              id="trialDays"
              name="trialDays"
              type="number"
              defaultValue={campaign?.trialDays ?? 7}
              min={1}
              max={90}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trialRecipesPerDay">Recetas / día</Label>
            <Input
              id="trialRecipesPerDay"
              name="trialRecipesPerDay"
              type="number"
              defaultValue={campaign?.trialRecipesPerDay ?? 5}
              min={1}
              max={50}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetPlanId">Plan al expirar</Label>
            <select
              id="targetPlanId"
              name="targetPlanId"
              defaultValue={campaign?.targetPlanId ?? plans[0]?.id ?? ""}
              required
              className="w-full rounded-md border bg-background px-3 h-10 text-sm"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {(p.priceCents / 100).toFixed(2)} €/
                  {p.interval === "MONTH" ? "mes" : "año"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Al finalizar el trial se cobrará automáticamente el plan elegido a
          la tarjeta que el usuario guardó en el registro.
        </p>
      </fieldset>

      {/* Section: copy de la landing */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Landing (copy)
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="heroBadge">Badge superior</Label>
            <Input
              id="heroBadge"
              name="heroBadge"
              defaultValue={campaign?.heroBadge ?? ""}
              maxLength={40}
              placeholder="7 días gratis"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctaLabel">Texto del botón</Label>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              defaultValue={campaign?.ctaLabel ?? ""}
              maxLength={60}
              placeholder="Empezar gratis"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroTitle">Título principal</Label>
          <Input
            id="heroTitle"
            name="heroTitle"
            defaultValue={campaign?.heroTitle ?? ""}
            maxLength={120}
            placeholder="Cocina con lo que tienes en la nevera"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroSubtitle">Subtítulo</Label>
          <textarea
            id="heroSubtitle"
            name="heroSubtitle"
            defaultValue={campaign?.heroSubtitle ?? ""}
            maxLength={300}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Recetas personalizadas en segundos…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bulletList">Bullets (separados por "|")</Label>
          <Input
            id="bulletList"
            name="bulletList"
            defaultValue={campaign?.bulletList ?? ""}
            maxLength={500}
            placeholder="Recetas IA | Foto de la nevera | Cocina por voz"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroImageUrl">URL de imagen hero (opcional)</Label>
          <Input
            id="heroImageUrl"
            name="heroImageUrl"
            defaultValue={campaign?.heroImageUrl ?? ""}
            maxLength={500}
            placeholder="https://… o /uploads/hero.jpg"
          />
        </div>
      </fieldset>

      {/* Section: avanzado */}
      <fieldset className="space-y-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {advancedOpen ? "▾" : "▸"} Avanzado
        </button>
        {advancedOpen && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="customHtml">HTML personalizado (opcional)</Label>
              <textarea
                id="customHtml"
                name="customHtml"
                defaultValue={campaign?.customHtml ?? ""}
                rows={8}
                maxLength={20_000}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                placeholder="<div>…</div> — si lo rellenas, sustituye la landing por defecto"
              />
              <p className="text-[11px] text-muted-foreground">
                Cuando rellenas este campo, la landing reemplaza completamente
                la plantilla por defecto. El formulario de registro debe
                apuntar a <code>/r/{campaign?.slug ?? "<slug>"}#signup</code>{" "}
                o usar un iframe.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Caduca el</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                defaultValue={expiresValue}
              />
              <p className="text-[11px] text-muted-foreground">
                Tras esta fecha la URL deja de aceptar signups. Déjalo vacío
                para que esté activa indefinidamente.
              </p>
            </div>
          </div>
        )}
      </fieldset>

      {/* Section: estado */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Estado
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={campaign?.isActive ?? true}
            className="size-4 accent-primary"
          />
          Activa (la URL acepta signups)
        </label>
      </fieldset>

      <div className="flex justify-between items-center gap-3 pt-2">
        {campaign ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        ) : (
          <div />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : campaign ? "Guardar cambios" : "Crear campaña"}
        </Button>
      </div>
    </form>
  );
}
