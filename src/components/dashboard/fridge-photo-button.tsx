"use client";

import * as React from "react";
import { Camera, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { detectIngredientsFromImageAction } from "@/actions/vision";

export function FridgePhotoButton({
  onDetected,
}: {
  onDetected: (ingredients: string[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);

  function open() {
    inputRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La foto excede 10 MB");
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set("image", file);
    try {
      const res = await detectIngredientsFromImageAction(fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      if (res.data.ingredients.length === 0) {
        toast.message(
          "No hemos detectado ingredientes claros. Prueba con otra foto o añádelos a mano."
        );
        return;
      }
      onDetected(res.data.ingredients);
      toast.success(
        `${res.data.ingredients.length} ingredientes detectados`
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={open}
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? (
          <>
            <Sparkles className="size-4 animate-pulse" />
            Analizando foto…
          </>
        ) : (
          <>
            <Camera className="size-4" />
            Foto de la nevera
          </>
        )}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
    </>
  );
}
