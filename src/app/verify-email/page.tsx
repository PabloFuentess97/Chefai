import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { verifyEmailAction } from "@/actions/auth";
import { Brand } from "@/components/shared/brand";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = { title: "Verifica tu email" };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailAction(token) : null;
  const ok = result?.ok === true;

  return (
    <div className="min-h-svh flex flex-col">
      <header className="p-6">
        <Brand />
      </header>
      <main className="flex-1 grid place-items-center px-6">
        <div className="max-w-md text-center space-y-4">
          {ok ? (
            <>
              <CheckCircle2 className="size-12 text-primary mx-auto" />
              <h1 className="text-2xl font-semibold">Email verificado</h1>
              <p className="text-muted-foreground">
                Tu cuenta está confirmada. Ya puedes generar recetas sin
                limitaciones.
              </p>
              <Link
                href="/dashboard"
                className="inline-block text-primary hover:underline font-medium"
              >
                Ir al panel →
              </Link>
            </>
          ) : (
            <>
              <AlertCircle className="size-12 text-destructive mx-auto" />
              <h1 className="text-2xl font-semibold">Enlace no válido</h1>
              <p className="text-muted-foreground">
                {result?.ok === false
                  ? result.error.message
                  : "Falta el token de verificación."}
              </p>
              <Link
                href="/login"
                className="inline-block text-primary hover:underline font-medium"
              >
                Volver al login
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
