"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  createStripeCheckoutAction,
  createPaypalOrderAction,
  openStripePortalAction,
  cancelSubscriptionAction,
} from "@/actions/billing";

export function StripeCheckoutButton({
  planSlug,
  label,
  variant = "default",
}: {
  planSlug: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createStripeCheckoutAction({ planSlug });
          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }
          window.location.href = res.data.url;
        })
      }
    >
      {pending ? "Conectando…" : label}
    </Button>
  );
}

export function PaypalCheckoutButton({
  planSlug,
  label,
}: {
  planSlug: string;
  label: string;
}) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await createPaypalOrderAction({ planSlug });
          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }
          window.location.href = res.data.approveUrl;
        })
      }
    >
      {pending ? "Conectando…" : label}
    </Button>
  );
}

export function StripePortalButton() {
  const [pending, start] = React.useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await openStripePortalAction();
          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }
          window.location.href = res.data.url;
        })
      }
    >
      {pending ? "Abriendo…" : "Gestionar suscripción"}
    </Button>
  );
}

export function CancelSubscriptionButton() {
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Cancelar al final del periodo facturado?")) return;
        start(async () => {
          const res = await cancelSubscriptionAction();
          if (!res.ok) {
            toast.error(res.error.message);
            return;
          }
          toast.success("Cancelación programada");
          router.refresh();
        });
      }}
    >
      {pending ? "Cancelando…" : "Cancelar suscripción"}
    </Button>
  );
}
