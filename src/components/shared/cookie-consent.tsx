"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "chefai-cookie-consent";

type Consent = "all" | "essential";

declare global {
  interface Window {
    chefaiConsent?: Consent;
  }
}

export function CookieConsent() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Consent | null;
      if (!stored) {
        // Defer a tick so the banner doesn't flash during route transitions
        setTimeout(() => setOpen(true), 200);
      } else {
        window.chefaiConsent = stored;
      }
    } catch {
      setOpen(true);
    }
  }, []);

  function save(value: Consent) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    window.chefaiConsent = value;
    setOpen(false);
  }

  if (!mounted || !open) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card shadow-2xl p-5 pointer-events-auto">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="size-10 grid place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Cookie className="size-5" />
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            <p className="font-semibold leading-tight">
              Esta web usa cookies
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Solo utilizamos las cookies imprescindibles para mantener tu
              sesión iniciada. No usamos cookies de terceros, publicidad ni
              tracking. Puedes leer más en nuestra{" "}
              <Link
                href="/cookies"
                className="text-primary hover:underline font-medium"
              >
                política de cookies
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => save("essential")}
              >
                Solo esenciales
              </Button>
              <Button size="sm" onClick={() => save("all")}>
                Aceptar todo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
