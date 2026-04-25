"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-svh grid place-items-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">Error</p>
        <h1 className="text-3xl font-bold">Algo no ha salido bien</h1>
        <p className="text-muted-foreground">
          Hemos registrado el problema. Inténtalo de nuevo en un momento.
        </p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
