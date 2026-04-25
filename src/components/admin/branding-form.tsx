"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettingsAction, uploadBrandLogoAction } from "@/actions/admin";

type Settings = {
  brandName: string;
  brandTagline: string | null;
  brandLogoUrl: string | null;
  brandColor: string;
  supportEmail: string;
  termsUrl: string | null;
  privacyUrl: string | null;
};

export function BrandingForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [uploadPending, startUpload] = React.useTransition();
  const [logoUrl, setLogoUrl] = React.useState(settings.brandLogoUrl ?? "");
  const [color, setColor] = React.useState(settings.brandColor);

  function onSubmit(fd: FormData) {
    fd.set("brandLogoUrl", logoUrl);
    fd.set("brandColor", color);
    start(async () => {
      const res = await updateSettingsAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Branding actualizado");
      router.refresh();
    });
  }

  function onUpload(file: File) {
    const fd = new FormData();
    fd.set("logo", file);
    startUpload(async () => {
      const res = await uploadBrandLogoAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setLogoUrl(res.data.url);
      toast.success("Logo subido");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-5 max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brandName">Nombre de marca</Label>
          <Input
            id="brandName"
            name="brandName"
            defaultValue={settings.brandName}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supportEmail">Email de soporte</Label>
          <Input
            id="supportEmail"
            name="supportEmail"
            type="email"
            defaultValue={settings.supportEmail}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="brandTagline">Tagline</Label>
        <Textarea
          id="brandTagline"
          name="brandTagline"
          defaultValue={settings.brandTagline ?? ""}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Color primario</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="size-10 rounded-md border cursor-pointer"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="max-w-[140px] font-mono"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoFile">Logo (PNG/SVG, máx 1 MB)</Label>
        <div className="flex flex-wrap items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="size-12 rounded-md border object-contain bg-card p-1"
            />
          )}
          <input
            id="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            disabled={uploadPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
            className="text-sm"
          />
          {uploadPending && <span className="text-xs">Subiendo…</span>}
        </div>
        <Input
          name="brandLogoUrl"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="O pega una URL"
          className="font-mono text-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="termsUrl">URL de Términos</Label>
          <Input
            id="termsUrl"
            name="termsUrl"
            defaultValue={settings.termsUrl ?? ""}
            placeholder="/terms"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="privacyUrl">URL de Privacidad</Label>
          <Input
            id="privacyUrl"
            name="privacyUrl"
            defaultValue={settings.privacyUrl ?? ""}
            placeholder="/privacy"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar branding"}
      </Button>
    </form>
  );
}
