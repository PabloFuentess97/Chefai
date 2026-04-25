import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { capturePaypalOrderAction } from "@/actions/billing";

type Props = { searchParams: Promise<{ token?: string; PayerID?: string }> };

export const metadata = { title: "Confirmando pago" };

export default async function PaypalReturnPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const result = token ? await capturePaypalOrderAction(token) : null;
  const ok = result?.ok === true;

  return (
    <div className="max-w-md mx-auto py-12 text-center space-y-4">
      {ok ? (
        <>
          <CheckCircle2 className="size-12 text-primary mx-auto" />
          <h1 className="text-2xl font-semibold">¡Pago confirmado!</h1>
          <p className="text-muted-foreground">
            Tu plan ha sido activado. Disfruta cocinando.
          </p>
          <Link
            href="/billing"
            className="inline-block text-primary hover:underline font-medium"
          >
            Ver mi plan →
          </Link>
        </>
      ) : (
        <>
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-semibold">No se pudo confirmar</h1>
          <p className="text-muted-foreground">
            {result?.ok === false
              ? result.error.message
              : "Token de PayPal no recibido."}
          </p>
          <Link
            href="/billing"
            className="inline-block text-primary hover:underline font-medium"
          >
            Volver a Facturación
          </Link>
        </>
      )}
    </div>
  );
}
