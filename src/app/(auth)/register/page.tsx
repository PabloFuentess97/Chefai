import { RegisterForm } from "@/components/auth/register-form";

type Props = { searchParams: Promise<{ next?: string }> };

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Crea tu cuenta gratis
        </h1>
        <p className="text-sm text-muted-foreground">
          3 recetas gratis al mes. Sin tarjeta.
        </p>
      </div>
      <RegisterForm next={next} />
    </div>
  );
}
