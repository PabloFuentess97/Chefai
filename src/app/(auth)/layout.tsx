import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { getBranding } from "@/lib/branding";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getBranding();
  return (
    <div className="min-h-svh grid lg:grid-cols-2">
      <div className="flex flex-col p-6 lg:p-10">
        <header>
          <Brand />
        </header>
        <main className="flex-1 grid place-items-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="text-xs text-muted-foreground">
          <Link href="/terms" className="hover:underline">
            Términos
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:underline">
            Privacidad
          </Link>
        </footer>
      </div>
      <aside
        className="hidden lg:flex flex-col justify-end p-12 text-white"
        style={{
          background: `linear-gradient(135deg, ${branding.color} 0%, color-mix(in oklab, ${branding.color} 60%, #000) 100%)`,
        }}
      >
        <blockquote className="space-y-3 text-balance">
          <p className="text-2xl font-medium leading-snug">
            «He cocinado más en una semana con {branding.name} que en todo el
            mes anterior. Y mejor.»
          </p>
          <footer className="text-sm opacity-80">
            — Marta, suscriptora Pro
          </footer>
        </blockquote>
      </aside>
    </div>
  );
}
