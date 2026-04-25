import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export async function Navbar() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Brand />
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <Link
            href="/#features"
            className="text-muted-foreground hover:text-foreground"
          >
            Cómo funciona
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground"
          >
            Precios
          </Link>
          <Link
            href="/#faq"
            className="text-muted-foreground hover:text-foreground"
          >
            Preguntas
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <Button render={<Link href="/dashboard" />}>
              Ir al panel
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/login" />}
              >
                Iniciar sesión
              </Button>
              <Button render={<Link href="/register" />}>
                Empezar gratis
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
