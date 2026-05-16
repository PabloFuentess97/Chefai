"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Send, Eye, Mail, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  upsertEmailCampaignAction,
  deleteEmailCampaignAction,
  testSendEmailCampaignAction,
  sendEmailCampaignNowAction,
  previewAudienceAction,
} from "@/actions/email-campaigns";
import {
  EMAIL_TEMPLATES,
  getEmailTemplate,
  getBroadcastTemplates,
} from "@/lib/email-templates";
import { DIETARY_PROFILES } from "@/lib/diet-goals";
import { cn } from "@/lib/utils";

type Plan = { id: string; name: string; slug: string };
type AcqCampaign = { id: string; name: string; slug: string };

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  templateKey: string;
  accentColor: string | null;
  subject: string;
  preheader: string | null;
  heroBadge: string | null;
  heroTitle: string | null;
  heroBody: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
  audienceMode: string;
  audiencePlanId: string | null;
  audienceAcqCampaignId: string | null;
  audienceDietary: string | null;
  scheduledFor: Date | string | null;
  status: string;
};

type FormState = {
  templateKey: string;
  accentColor: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  heroBadge: string;
  heroTitle: string;
  heroBody: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  audienceMode:
    | "ALL_USERS"
    | "NEWSLETTER_OPT_IN"
    | "PLAN"
    | "ACQUISITION_CAMPAIGN"
    | "DIETARY_PROFILE";
  audiencePlanId: string;
  audienceAcqCampaignId: string;
  audienceDietary: string;
  scheduledFor: string; // ISO local datetime "YYYY-MM-DDTHH:mm"
};

function defaultState(plans: Plan[], campaign?: Campaign): FormState {
  return {
    templateKey: campaign?.templateKey ?? "marketing-generic",
    accentColor: campaign?.accentColor ?? "",
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    subject: campaign?.subject ?? "",
    preheader: campaign?.preheader ?? "",
    heroBadge: campaign?.heroBadge ?? "",
    heroTitle: campaign?.heroTitle ?? "",
    heroBody: campaign?.heroBody ?? "",
    ctaLabel: campaign?.ctaLabel ?? "",
    ctaUrl: campaign?.ctaUrl ?? "",
    imageUrl: campaign?.imageUrl ?? "",
    audienceMode:
      (campaign?.audienceMode as FormState["audienceMode"]) ?? "ALL_USERS",
    audiencePlanId: campaign?.audiencePlanId ?? plans[0]?.id ?? "",
    audienceAcqCampaignId: campaign?.audienceAcqCampaignId ?? "",
    audienceDietary: campaign?.audienceDietary ?? "vegetarian",
    scheduledFor: campaign?.scheduledFor
      ? new Date(campaign.scheduledFor).toISOString().slice(0, 16)
      : "",
  };
}

export function EmailCampaignForm({
  plans,
  acqCampaigns,
  campaign,
}: {
  plans: Plan[];
  acqCampaigns: AcqCampaign[];
  campaign?: Campaign;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [deleting, startDelete] = React.useTransition();
  const [sending, startSend] = React.useTransition();
  const [previewing, setPreviewing] = React.useTransition();
  const [s, setS] = React.useState<FormState>(() =>
    defaultState(plans, campaign)
  );
  const [testEmail, setTestEmail] = React.useState("");
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function pickTemplate(key: string) {
    const t = getEmailTemplate(key);
    if (!t) return;
    setS((prev) => ({
      ...prev,
      templateKey: t.key,
      accentColor: t.accentColor,
      subject: prev.subject || t.defaults.subject,
      preheader: prev.preheader || t.defaults.preheader,
      heroBadge: prev.heroBadge || t.defaults.heroBadge,
      heroTitle: prev.heroTitle || t.defaults.heroTitle,
      heroBody: prev.heroBody || t.defaults.heroBody,
      ctaLabel: prev.ctaLabel || t.defaults.ctaLabel,
      ctaUrl: prev.ctaUrl || t.defaults.ctaUrl,
      name: prev.name || t.name,
    }));
  }

  function applyTemplateOverwrite() {
    const t = getEmailTemplate(s.templateKey);
    if (!t) return;
    setS((prev) => ({
      ...prev,
      accentColor: t.accentColor,
      subject: t.defaults.subject,
      preheader: t.defaults.preheader,
      heroBadge: t.defaults.heroBadge,
      heroTitle: t.defaults.heroTitle,
      heroBody: t.defaults.heroBody,
      ctaLabel: t.defaults.ctaLabel,
      ctaUrl: t.defaults.ctaUrl,
    }));
    toast.success("Copy rellenado con la plantilla");
  }

  function onSubmit(fd: FormData) {
    start(async () => {
      const res = await upsertEmailCampaignAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(campaign ? "Cambios guardados" : "Campaña creada");
      router.push(`/admin/emails/${res.data.id}`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!campaign) return;
    if (!confirm("¿Eliminar esta campaña de email?")) return;
    startDelete(async () => {
      const res = await deleteEmailCampaignAction(campaign.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Eliminada");
      router.push("/admin/emails");
      router.refresh();
    });
  }

  function onTestSend() {
    if (!campaign) {
      toast.error("Guarda la campaña primero");
      return;
    }
    if (!testEmail) {
      toast.error("Pon un email para la prueba");
      return;
    }
    startSend(async () => {
      const res = await testSendEmailCampaignAction(campaign.id, testEmail);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Test enviado a ${testEmail}`);
    });
  }

  function onSendNow() {
    if (!campaign) {
      toast.error("Guarda la campaña primero");
      return;
    }
    if (
      !confirm(
        `¿Enviar la campaña ahora a la audiencia seleccionada? Esta acción no se puede deshacer.`
      )
    )
      return;
    startSend(async () => {
      const res = await sendEmailCampaignNowAction(campaign.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(
        `Enviadas ${res.data.sent} / ${res.data.recipients} (${res.data.failed} fallidas)`
      );
      router.refresh();
    });
  }

  function onPreviewAudience() {
    setPreviewing(async () => {
      const res = await previewAudienceAction({
        audienceMode: s.audienceMode,
        audiencePlanId: s.audiencePlanId || null,
        audienceAcqCampaignId: s.audienceAcqCampaignId || null,
        audienceDietary: s.audienceDietary || null,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setAudienceCount(res.data.count);
    });
  }

  const selectedTpl = getEmailTemplate(s.templateKey);
  const broadcastTpls = getBroadcastTemplates();

  return (
    <form action={onSubmit} className="space-y-8">
      {campaign && <input type="hidden" name="id" value={campaign.id} />}
      <input type="hidden" name="templateKey" value={s.templateKey} />
      <input type="hidden" name="accentColor" value={s.accentColor} />
      <input type="hidden" name="audienceMode" value={s.audienceMode} />
      <input
        type="hidden"
        name="audiencePlanId"
        value={s.audiencePlanId}
      />
      <input
        type="hidden"
        name="audienceAcqCampaignId"
        value={s.audienceAcqCampaignId}
      />
      <input
        type="hidden"
        name="audienceDietary"
        value={s.audienceDietary}
      />

      {/* Plantilla */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Plantilla
        </legend>
        <p className="text-xs text-muted-foreground -mt-2">
          Cada plantilla tiene su color, decoración y copy sugerido. Sigue
          siendo editable después.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {broadcastTpls.map((t) => (
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
              Plantilla:{" "}
              <strong className="text-foreground">{selectedTpl.name}</strong>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyTemplateOverwrite}
            >
              Reset copy a la plantilla
            </Button>
          </div>
        )}
      </fieldset>

      {/* Identidad */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Identidad
        </legend>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre interno</Label>
          <Input
            id="name"
            name="name"
            value={s.name}
            onChange={(e) => update("name", e.target.value)}
            required
            maxLength={120}
            placeholder="Black Friday email · Q4 2026"
          />
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
          />
        </div>
      </fieldset>

      {/* Contenido */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Contenido
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              name="subject"
              value={s.subject}
              onChange={(e) => update("subject", e.target.value)}
              required
              maxLength={180}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preheader">Preheader (preview)</Label>
            <Input
              id="preheader"
              name="preheader"
              value={s.preheader}
              onChange={(e) => update("preheader", e.target.value)}
              maxLength={180}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="heroBadge">Badge</Label>
            <Input
              id="heroBadge"
              name="heroBadge"
              value={s.heroBadge}
              onChange={(e) => update("heroBadge", e.target.value)}
              maxLength={60}
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
            maxLength={160}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heroBody">
            Cuerpo (usa <code>{"{name}"}</code> para personalizar)
          </Label>
          <textarea
            id="heroBody"
            name="heroBody"
            value={s.heroBody}
            onChange={(e) => update("heroBody", e.target.value)}
            maxLength={5000}
            rows={10}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground">
            Separa párrafos con una línea en blanco. Variables disponibles:{" "}
            <code>{"{name}"}</code>, <code>{"{email}"}</code>.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ctaUrl">URL del botón</Label>
            <Input
              id="ctaUrl"
              name="ctaUrl"
              value={s.ctaUrl}
              onChange={(e) => update("ctaUrl", e.target.value)}
              maxLength={500}
              placeholder="/r/black-friday o https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Imagen hero (opcional)</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              value={s.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
      </fieldset>

      {/* Audiencia */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Audiencia
        </legend>
        <div className="grid sm:grid-cols-3 gap-3">
          {(
            [
              ["ALL_USERS", "Todos", "Todos los usuarios registrados"],
              ["NEWSLETTER_OPT_IN", "Newsletter", "Solo opt-in"],
              ["PLAN", "Plan", "Filtrar por suscripción"],
              ["ACQUISITION_CAMPAIGN", "Landing", "Vienen de una campaña"],
              ["DIETARY_PROFILE", "Dieta", "Por perfil dietético"],
            ] as const
          ).map(([mode, label, desc]) => (
            <AudienceTile
              key={mode}
              active={s.audienceMode === mode}
              label={label}
              desc={desc}
              onClick={() => update("audienceMode", mode)}
            />
          ))}
        </div>

        {s.audienceMode === "PLAN" && (
          <div className="space-y-2">
            <Label>Plan</Label>
            <select
              value={s.audiencePlanId}
              onChange={(e) => update("audiencePlanId", e.target.value)}
              className="w-full rounded-md border bg-background px-3 h-10 text-sm"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {s.audienceMode === "ACQUISITION_CAMPAIGN" && (
          <div className="space-y-2">
            <Label>Campaña de origen</Label>
            <select
              value={s.audienceAcqCampaignId}
              onChange={(e) =>
                update("audienceAcqCampaignId", e.target.value)
              }
              className="w-full rounded-md border bg-background px-3 h-10 text-sm"
            >
              <option value="">Selecciona…</option>
              {acqCampaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (/r/{c.slug})
                </option>
              ))}
            </select>
          </div>
        )}

        {s.audienceMode === "DIETARY_PROFILE" && (
          <div className="space-y-2">
            <Label>Perfil dietético</Label>
            <select
              value={s.audienceDietary}
              onChange={(e) => update("audienceDietary", e.target.value)}
              className="w-full rounded-md border bg-background px-3 h-10 text-sm"
            >
              {DIETARY_PROFILES.filter((d) => d.id !== "omnivore").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
            <Users className="size-3.5" />
            {audienceCount === null
              ? "Pulsa para ver el tamaño de la audiencia"
              : `Audiencia actual: ${audienceCount} ${audienceCount === 1 ? "usuario" : "usuarios"}`}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreviewAudience}
            disabled={previewing}
          >
            {previewing ? "Calculando…" : "Calcular audiencia"}
          </Button>
        </div>
      </fieldset>

      {/* Programación */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Programación
        </legend>
        <div className="space-y-2">
          <Label htmlFor="scheduledFor">
            Programar para (opcional · si lo dejas vacío queda en borrador)
          </Label>
          <Input
            id="scheduledFor"
            name="scheduledFor"
            type="datetime-local"
            value={s.scheduledFor}
            onChange={(e) => update("scheduledFor", e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            El worker comprueba cada 15 min. La hora es local del servidor
            (Madrid).
          </p>
        </div>
      </fieldset>

      {/* Test send + send now (solo cuando ya hay campaña guardada) */}
      {campaign && (
        <fieldset className="space-y-3 rounded-xl bg-muted/40 p-4">
          <legend className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Envío
          </legend>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[240px] space-y-2">
              <Label htmlFor="testEmail">Email de prueba</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onTestSend}
              disabled={sending}
            >
              <Eye className="size-4" />
              Test send
            </Button>
            <Button
              type="button"
              onClick={onSendNow}
              disabled={sending || campaign.status === "SENT"}
            >
              <Send className="size-4" />
              {campaign.status === "SENT" ? "Ya enviado" : "Enviar ahora"}
            </Button>
          </div>
        </fieldset>
      )}

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
          <Mail className="size-4" />
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
          ? "border-primary bg-primary/5"
          : "border-border hover:border-foreground/30"
      )}
      style={active ? { borderColor: accent } : undefined}
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

function AudienceTile({
  active,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-all active:scale-[0.98]",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:border-foreground/30"
      )}
    >
      <p className="font-semibold text-sm">{label}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
    </button>
  );
}
