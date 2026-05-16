"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  prepareCampaignSetupIntentAction,
  registerWithCampaignAction,
} from "@/actions/auth";

// Lazy-load Stripe once per page. The key is public — safe to ship.
let stripePromise: Promise<StripeJs | null> | null = null;
function getStripeJs(): Promise<StripeJs | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

export function CampaignSignupForm({
  campaignSlug,
  ctaLabel,
  brandColor,
}: {
  campaignSlug: string;
  ctaLabel: string;
  brandColor: string;
}) {
  const [phase, setPhase] = React.useState<"intro" | "card" | "done">("intro");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function startSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email y contraseña son obligatorios");
      return;
    }
    setPending(true);
    try {
      const res = await prepareCampaignSetupIntentAction({
        email,
        campaignSlug,
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setClientSecret(res.data.clientSecret);
      setPhase("card");
    } finally {
      setPending(false);
    }
  }

  if (phase === "intro" || !clientSecret) {
    return (
      <form onSubmit={startSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Tu nombre</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pablo"
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pablo@ejemplo.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 10 caracteres, una letra y un número"
            required
            autoComplete="new-password"
          />
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="w-full"
          style={{ background: brandColor, color: "white" }}
        >
          {pending ? "Preparando…" : "Continuar"}
        </Button>
        <p className="text-[11px] text-muted-foreground leading-snug">
          A continuación pediremos tu tarjeta. No se cobra nada durante el
          trial. Cancela cuando quieras desde tu cuenta.
        </p>
      </form>
    );
  }

  return (
    <Elements
      stripe={getStripeJs()}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: brandColor },
        },
      }}
    >
      <CardStep
        campaignSlug={campaignSlug}
        email={email}
        password={password}
        name={name}
        ctaLabel={ctaLabel}
        brandColor={brandColor}
      />
    </Elements>
  );
}

function CardStep({
  campaignSlug,
  email,
  password,
  name,
  ctaLabel,
  brandColor,
}: {
  campaignSlug: string;
  email: string;
  password: string;
  name: string;
  ctaLabel: string;
  brandColor: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const confirmed = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (confirmed.error) {
        toast.error(
          confirmed.error.message ?? "No hemos podido guardar tu tarjeta"
        );
        return;
      }
      const paymentMethod =
        typeof confirmed.setupIntent?.payment_method === "string"
          ? confirmed.setupIntent.payment_method
          : confirmed.setupIntent?.payment_method?.id;

      if (!paymentMethod) {
        toast.error("Stripe no devolvió un método de pago. Inténtalo otra vez.");
        return;
      }

      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      if (name) fd.set("name", name);
      fd.set("campaignSlug", campaignSlug);
      fd.set("stripePaymentMethodId", paymentMethod);

      const res = await registerWithCampaignAction(null, fd);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("¡Bienvenido! Tu trial ha empezado.");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 block">Método de pago</Label>
        <PaymentElement />
      </div>
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full"
        style={{ background: brandColor, color: "white" }}
      >
        {submitting ? "Procesando…" : ctaLabel}
      </Button>
      <p className="text-[11px] text-muted-foreground leading-snug">
        No se cobra nada durante el trial. Al finalizar, se cobrará el plan
        automáticamente con esta tarjeta. Cancela cuando quieras desde tu
        cuenta y no se te cobrará.
      </p>
    </form>
  );
}
