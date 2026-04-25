import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type Props = { searchParams: Promise<{ token?: string }> };

export const metadata = { title: "Cambiar contraseña" };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Enlace no válido</h1>
        <p className="text-sm text-muted-foreground">
          Este enlace no incluye un token. Solicita uno nuevo.
        </p>
        <Link href="/forgot-password" className="text-primary hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Elige una nueva contraseña
        </h1>
        <p className="text-sm text-muted-foreground">
          Esto cerrará todas tus sesiones activas.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
