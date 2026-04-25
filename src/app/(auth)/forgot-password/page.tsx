import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Recuperar contraseña
        </h1>
        <p className="text-sm text-muted-foreground">
          Te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
