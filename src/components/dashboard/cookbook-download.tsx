"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CookbookDownloadButton({
  enabled,
  count,
}: {
  enabled: boolean;
  count: number;
}) {
  const [pending, setPending] = React.useState(false);

  async function onDownload() {
    if (count === 0) {
      toast.error(
        "Marca al menos una receta como favorita para crear tu recetario"
      );
      return;
    }
    if (!enabled) {
      toast.error("Disponible en plan Pro o superior");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/cookbook");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "No se pudo generar el recetario");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recetario.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("¡Recetario listo!");
    } catch {
      toast.error("Error al descargar el recetario");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      size="lg"
      onClick={onDownload}
      disabled={pending || count === 0 || !enabled}
      className="w-full sm:w-auto"
    >
      <Download className="size-4" />
      {pending
        ? "Maquetando…"
        : enabled
          ? `Descargar recetario (${count} recetas)`
          : "Disponible en Pro"}
    </Button>
  );
}
