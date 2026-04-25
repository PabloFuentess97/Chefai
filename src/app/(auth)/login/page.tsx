import { LoginForm } from "@/components/auth/login-form";

type Props = { searchParams: Promise<{ next?: string }> };

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-muted-foreground">
          Inicia sesión para seguir cocinando.
        </p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
