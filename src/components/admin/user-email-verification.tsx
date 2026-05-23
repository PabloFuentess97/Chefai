"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Send, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  verifyUserEmailAction,
  unverifyUserEmailAction,
  resendVerifyEmailAction,
} from "@/actions/admin";

type Props = {
  userId: string;
  email: string;
  isVerified: boolean;
};

/**
 * Admin-side controls to verify a user's email manually (when Resend
 * fails, is misconfigured, or the user can't access their inbox).
 * Mounted on /admin/users/[id]. Server-side requireAdmin() gates the
 * actions — the UI is just a thin wrapper.
 */
export function UserEmailVerification({ userId, email, isVerified }: Props) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  function onVerify() {
    if (
      !confirm(
        `Verificar manualmente el email de ${email}? El usuario podrá acceder a todas las funciones sin pasar por el enlace.`
      )
    )
      return;
    start(async () => {
      const res = await verifyUserEmailAction(userId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Email marcado como verificado");
      router.refresh();
    });
  }

  function onUnverify() {
    if (
      !confirm(
        `Quitar la verificación del email de ${email}? El usuario quedará bloqueado de las funciones que consumen IA hasta que verifique de nuevo.`
      )
    )
      return;
    start(async () => {
      const res = await unverifyUserEmailAction(userId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Verificación retirada");
      router.refresh();
    });
  }

  function onResend() {
    start(async () => {
      const res = await resendVerifyEmailAction(userId);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`Email reenviado a ${res.data.email}`);
    });
  }

  return (
    <div className="space-y-4">
      <div
        className={
          isVerified
            ? "rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3"
            : "rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4 flex items-start gap-3"
        }
      >
        {isVerified ? (
          <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 text-sm">
          <p className="font-semibold">
            {isVerified ? "Email verificado" : "Email sin verificar"}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {isVerified
              ? "El usuario puede usar todas las funciones que consumen IA."
              : "El usuario está bloqueado de generación de recetas, planner, foto de la nevera y sustituciones hasta que verifique."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isVerified ? (
          <>
            <Button
              onClick={onVerify}
              disabled={pending}
              className="bg-primary text-primary-foreground"
            >
              <CheckCircle2 className="size-4" />
              Verificar manualmente
            </Button>
            <Button
              variant="outline"
              onClick={onResend}
              disabled={pending}
            >
              <Send className="size-4" />
              Reenviar email de verificación
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            onClick={onUnverify}
            disabled={pending}
            className="text-destructive hover:text-destructive"
          >
            <XCircle className="size-4" />
            Quitar verificación
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <strong>Verificar manualmente</strong> — marca el email como
        verificado sin enviar nada (úsalo si conoces al usuario o has
        verificado su identidad por otro canal).
        <br />
        <strong>Reenviar email</strong> — genera un token nuevo (el
        anterior queda invalidado) y manda el email vía Resend.
        <br />
        <strong>Quitar verificación</strong> — para casos de soporte donde
        necesites bloquear el acceso a funciones sin desactivar la cuenta.
      </p>
    </div>
  );
}
