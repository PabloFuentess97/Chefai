import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getBranding } from "@/lib/branding";

export const metadata = { title: "Darse de baja" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  const branding = await getBranding();

  let success = false;
  let alreadyUnsubscribed = false;

  if (token) {
    const user = await prisma.user.findUnique({
      where: { emailUnsubscribeToken: token },
      select: { id: true, unsubscribedAt: true },
    });
    if (user) {
      if (user.unsubscribedAt) {
        alreadyUnsubscribed = true;
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            newsletterOptIn: false,
            unsubscribedAt: new Date(),
          },
        });
        success = true;
      }
    }
  }

  return (
    <div className="min-h-svh grid place-items-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-5 py-12">
        {success || alreadyUnsubscribed ? (
          <CheckCircle2
            className="size-12 mx-auto text-primary"
            aria-hidden="true"
          />
        ) : (
          <XCircle
            className="size-12 mx-auto text-destructive"
            aria-hidden="true"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {success
              ? "Te has dado de baja"
              : alreadyUnsubscribed
                ? "Ya estás dado de baja"
                : "Enlace no válido"}
          </h1>
          <p className="text-muted-foreground mt-2 text-pretty">
            {success
              ? `No volverás a recibir emails de marketing de ${branding.name}. Los emails imprescindibles (cuenta, pagos, seguridad) sí seguirán llegando.`
              : alreadyUnsubscribed
                ? `Tu cuenta ya estaba marcada como dada de baja. No recibirás más emails de marketing.`
                : `El enlace no es válido o ha caducado. Si quieres dejar de recibir emails, escríbenos a ${branding.supportEmail}.`}
          </p>
        </div>
        <Link
          href="/"
          className="inline-block text-sm text-primary hover:underline"
        >
          Volver a la app
        </Link>
      </div>
    </div>
  );
}
