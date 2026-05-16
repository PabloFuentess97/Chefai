import Link from "next/link";
import { Clock, AlertCircle, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  isOnActiveTrial,
  isTrialExpiredUnpaid,
  trialDaysRemaining,
} from "@/lib/campaigns";

/**
 * Server component. Shows nothing for non-trial users, a soft banner during
 * the trial window, and a paywall card when the trial expired without a
 * successful auto-charge (e.g. payment failed).
 */
export async function TrialBanner({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      trialEndsAt: true,
      trialChargedAt: true,
      trialPlanId: true,
      campaign: {
        select: {
          name: true,
          trialRecipesPerDay: true,
          targetPlan: { select: { name: true, slug: true, priceCents: true } },
        },
      },
    },
  });

  if (!user || !user.trialEndsAt) return null;

  if (isOnActiveTrial(user)) {
    const days = trialDaysRemaining(user.trialEndsAt);
    const plan = user.campaign?.targetPlan;
    return (
      <div
        className="rounded-xl border bg-primary/5 border-primary/30 p-4 flex items-center gap-3 flex-wrap"
        role="status"
      >
        <Clock className="size-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            Trial activo · {days} {days === 1 ? "día restante" : "días restantes"}
          </p>
          <p className="text-xs text-muted-foreground">
            {user.campaign?.trialRecipesPerDay ?? 5} recetas/día. Al finalizar
            pasarás a <strong>{plan?.name ?? "Pro"}</strong>
            {plan && ` (${(plan.priceCents / 100).toFixed(2)} €/mes)`}.
          </p>
        </div>
        <Link
          href="/billing"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Gestionar <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  if (isTrialExpiredUnpaid(user)) {
    return (
      <div
        className="rounded-xl border bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 p-4 flex items-center gap-3 flex-wrap"
        role="alert"
      >
        <AlertCircle className="size-5 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Tu trial ha terminado</p>
          <p className="text-xs text-muted-foreground">
            Estamos intentando renovar tu suscripción. Si el pago falla,
            actualiza tu tarjeta para seguir generando recetas.
          </p>
        </div>
        <Link
          href="/billing"
          className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
        >
          Actualizar pago <ArrowRight className="size-3" />
        </Link>
      </div>
    );
  }

  return null;
}
