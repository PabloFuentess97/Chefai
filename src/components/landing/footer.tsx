import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { getBranding } from "@/lib/branding";

export async function Footer() {
  const branding = await getBranding();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-10 md:py-14">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Brand />
            <p className="text-sm text-muted-foreground max-w-xs">
              {branding.tagline}
            </p>
          </div>
          <div>
            <p className="font-medium mb-3 text-sm">Producto</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-foreground">
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-foreground">
                  Preguntas
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-3 text-sm">Cuenta</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground">
                  Crear cuenta
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-3 text-sm">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href={branding.termsUrl}
                  className="hover:text-foreground"
                >
                  Términos
                </Link>
              </li>
              <li>
                <Link
                  href={branding.privacyUrl}
                  className="hover:text-foreground"
                >
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-foreground">
                  Cookies
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${branding.supportEmail}`}
                  className="hover:text-foreground"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
          <p>© {year} {branding.name}. Todos los derechos reservados.</p>
          <p>Hecho con cariño y un horno encendido.</p>
        </div>
      </div>
    </footer>
  );
}
