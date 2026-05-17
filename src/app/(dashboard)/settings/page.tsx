import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { LogoutButton } from "@/components/settings/logout-button";
import type { DietGoal, DietaryProfile } from "@/lib/diet-goals";
import type { ApplianceId } from "@/lib/appliances";

export const metadata = { title: "Tu cuenta" };

export default async function SettingsPage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      role: true,
      preferredGoal: true,
      dietaryProfile: true,
      cookingAppliances: true,
    },
  });
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Tu cuenta
        </h1>
        <p className="text-muted-foreground">
          Edita tu perfil, tu objetivo nutricional y gestiona tu sesión.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultName={user.name}
            email={user.email}
            defaultGoal={(user.preferredGoal as DietGoal | null) ?? null}
            defaultDietary={
              (user.dietaryProfile as DietaryProfile | null) ?? null
            }
            defaultAppliances={
              (user.cookingAppliances as ApplianceId[]) ?? []
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Administración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Gestiona planes, usuarios y branding desde el panel.
            </p>
            <Button variant="outline" render={<Link href="/admin" />}>
              Abrir panel admin
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Cierra sesión en este dispositivo. Tendrás que volver a iniciar
            sesión la próxima vez.
          </p>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
