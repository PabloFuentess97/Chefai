"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Sparkles, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertCampaignAction,
  deleteCampaignAction,
} from "@/actions/admin";
import {
  CAMPAIGN_TEMPLATES,
  getCampaignTemplate,
} from "@/lib/campaign-templates";
import { cn } from "@/lib/utils";

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
  templateKey: string | null;
  accentColor: string | null;
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
  expiresAt: Date | string | null;
};

type FormState = {
  templateKey: string;
  accentColor: string;
  name: string;
  slug: string;
  description: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  ctaLabel: string;
  bulletList: string;
  customHtml: string;
  trialDays: number;
  trialRecipesPerDay: number;
  targetPlanId: string;
  isActive: boolean;
  expiresAt: string;
};

function defaultState(plans: Plan[], campaign?: Campaign): FormState {
  return {
    templateKey: campaign?.templateKey ?? "",
    accentColor: campaign?.accentColor ?? "",
    name: campaign?.name ?? "",
    slug: campaign?.slug ?? "",
    description: campaign?.description ?? "",
    heroBadge: campaign?.heroBadge ?? "",
    heroTitle: campaign?.heroTitle ?? "",
    heroSubtitle: campaign?.heroSubtitle ?? "",
    heroImageUrl: campaign?.heroImageUrl ?? "",
    ctaLabel: campaign?.ctaLabel ?? "",
    bulletList: campaign?.bulletList ?? "",
    customHtml: campaign?.customHtml ?? "",
    trialDays: campaign?.trialDays ?? 7,
    trialRecipesPerDay: campaign?.trialRecipesPerDay ?? 5,
    targetPlanId: campaign?.targetPlanId ?? plans[0]?.id ?? "",
    isActive: campaign?.isActive ?? true,
    expiresAt: campaign?.expiresAt
      ? new Date(campaign.expiresAt).toISOString().slice(0, 10)
      : "",
  };
}

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
  const [s, setS] = React.useState<FormState>(() =>
    defaultState(plans, campaign)
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function pickTemplate(key: string) {
    if (!key) {
      update("templateKey", "");
      return;
    }
    const t = getCampaignTemplate(key);
    if (!t) return;
    // Selecting a template only changes templateKey + accent + (only when
    // empty) the copy fields, so editing-an-existing campaign doesn't blow
    // away the admin's work.
    setS((prev) => ({
      ...prev,
      templateKey: t.key,
      accentColor: t.accentColor,
      name: prev.name || t.defaults.name,
      slug: prev.slug || t.defaults.slug,
      heroBadge: prev.heroBadge || t.defaults.heroBadge,
      heroTitle: prev.heroTitle || t.defaults.heroTitle,
      heroSubtitle: prev.heroSubtitle || t.defaults.heroSubtitle,
      bulletList: prev.bulletList || t.defaults.bulletList,
      ctaLabel: prev.ctaLabel || t.defaults.ctaLabel,
      trialDays: prev.trialDays || t.defaults.trialDays,
      trialRecipesPerDay:
        prev.trialRecipesPerDay || t.defaults.trialRecipesPerDay,
    }));
  }

  function resetToTemplate() {
    const t = getCampaignTemplate(s.templateKey);
    if (!t) {
      toast.error("Elige primero una plantilla");
      return;
    }
    setS((prev) => ({
      ...prev,
      accentColor: t.accentColor,
      heroBadge: t.defaults.heroBadge,
      heroTitle: t.defaults.heroTitle,
      heroSubtitle: t.defaults.heroSubtitle,
      bulletList: t.defaults.bulletList,
      ctaLabel: t.defaults.ctaLabel,
      trialDays: t.defaults.trialDays,
      trialRecipesPerDay: t.defaults.trialRecipesPerDay,
    }));
    toast.success("Campos rellenados con la plantilla");
  }

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
    if (
      !confirm("¿Eliminar esta campaña? Los usuarios ya creados se mantienen.")
    ) {
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

  const selectedTpl = getCampaignTemplate(s.templateKey);

  return (
    <form action={onSubmit} className="space-y-8">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      {/* These hidden inputs ship the state into the form submission */}
      <input type="hidden" name="templateKey" value={s.templateKey} />
      <input type="hidden" name="accentColor" value={s.accentColor} />

      {/* Section: plantilla */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Plantilla
        </legend>
        <p className="text-xs text-muted-foreground -mt-2">
          Elige una plantilla para autorrellenar copy + color de acento. Sigue
          siendo totalmente editable después.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Custom (no template) tile */}
          <TemplateTile
            active={!s.templateKey}
            emoji="✏️"
            name="Personalizada"
            vibe="Sin plantilla — escribe tú"
            accent="#78716c"
            onClick={() => pickTemplate("")}
          />
          {CAMPAIGN_TEMPLATES.map((t) => (
            <TemplateTile
              key={t.key}
              active={s.templateKey === t.key}
              emoji={t.emoji}
              name={t.name}
              vibe={t.vibe}
              accent={t.accentColor}
              onClick={() => pickTemplate(t.key)}
            />
          ))}
        </div>
        {selectedTpl && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted-foreground">
              Plantilla seleccionada:{" "}
              <strong className="text-foreground">{selectedTpl.name}</strong>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetToTemplate}
            >
              <RotateCcw className="size-3.5" />
              Reset copy a la plantilla
            </Button>
          </div>
        )}
      </fieldset>

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
              value={s.name}
              onChange={(e) => update("name", e.target.value)}
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
              value={s.slug}
              onChange={(e) => update("slug", e.target.value)}
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
            value={s.description}
            onChange={(e) => update("description", e.target.value)}
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
              value={s.trialDays}
              onChange={(e) =>
                update("trialDays", Number(e.target.value) || 0)
              }
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
              value={s.trialRecipesPerDay}
              onChange={(e) =>
                update("trialRecipesPerDay", Number(e.target.value) || 0)
              }
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
              value={s.targetPlanId}
              onChange={(e) => update("targetPlanId", e.target.value)}
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
          Al finalizar el trial se cobrará automáticamente el plan elegido a la
          tarjeta que el usuario guardó en el registro.
        </p>
      </fieldset>

      {/* Section: copy */}
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
              value={s.heroBadge}
              onChange={(e) => update("heroBadge", e.target.value)}
              maxLength={40}
              placeholder="7 días gratis"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctaLabel">Texto del botón</Label>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              value={s.ctaLabel}
              onChange={(e) => update("ctaLabel", e.target.value)}
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
            value={s.heroTitle}
            onChange={(e) => update("heroTitle", e.target.value)}
            maxLength={120}
            placeholder="Cocina con lo que tienes en la nevera"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroSubtitle">Subtítulo</Label>
          <textarea
            id="heroSubtitle"
            name="heroSubtitle"
            value={s.heroSubtitle}
            onChange={(e) => update("heroSubtitle", e.target.value)}
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
            value={s.bulletList}
            onChange={(e) => update("bulletList", e.target.value)}
            maxLength={500}
            placeholder="Recetas IA | Foto de la nevera | Cocina por voz"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroImageUrl">URL de imagen hero (opcional)</Label>
          <Input
            id="heroImageUrl"
            name="heroImageUrl"
            value={s.heroImageUrl}
            onChange={(e) => update("heroImageUrl", e.target.value)}
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
              <Label htmlFor="accentColorInput">Color de acento (HEX)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="accentColorInput"
                  value={s.accentColor}
                  onChange={(e) => update("accentColor", e.target.value)}
                  maxLength={7}
                  placeholder="#16a34a"
                  className="font-mono"
                />
                {s.accentColor && (
                  <div
                    className="size-10 rounded-md border shrink-0"
                    style={{ background: s.accentColor }}
                  />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Se aplica solo en la landing. Si lo dejas vacío usa el color
                de la plantilla (o el de marca).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customHtml">HTML personalizado (opcional)</Label>
              <textarea
                id="customHtml"
                name="customHtml"
                value={s.customHtml}
                onChange={(e) => update("customHtml", e.target.value)}
                rows={8}
                maxLength={20_000}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                placeholder="<div>…</div> — si lo rellenas, sustituye la landing por defecto"
              />
              <p className="text-[11px] text-muted-foreground">
                Cuando rellenas este campo, la landing reemplaza completamente
                la plantilla por defecto.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Caduca el</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="date"
                value={s.expiresAt}
                onChange={(e) => update("expiresAt", e.target.value)}
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
            checked={s.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
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
          <Sparkles className="size-4" />
          {pending
            ? "Guardando…"
            : campaign
              ? "Guardar cambios"
              : "Crear campaña"}
        </Button>
      </div>
    </form>
  );
}

function TemplateTile({
  active,
  emoji,
  name,
  vibe,
  accent,
  onClick,
}: {
  active: boolean;
  emoji: string;
  name: string;
  vibe: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
        active
          ? "ring-2 ring-offset-1"
          : "border-border hover:border-foreground/30"
      )}
      style={
        active
          ? {
              borderColor: accent,
              boxShadow: `inset 0 0 0 1px ${accent}`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl leading-none">{emoji}</span>
        <span
          className="font-semibold text-sm leading-tight"
          style={{ color: active ? accent : undefined }}
        >
          {name}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{vibe}</p>
      <div
        className="mt-2 h-1.5 rounded-full"
        style={{ background: accent, opacity: active ? 1 : 0.35 }}
      />
    </button>
  );
}
