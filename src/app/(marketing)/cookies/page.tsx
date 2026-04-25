import type { Metadata } from "next";
import { getBranding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Información sobre las cookies que utilizamos en ChefAI. Solo cookies imprescindibles, sin tracking ni publicidad.",
  alternates: { canonical: "/cookies" },
};

export default async function CookiesPage() {
  const branding = await getBranding();
  const updated = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="prose prose-stone dark:prose-invert mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
      <h1>Política de cookies</h1>
      <p className="lead">Última actualización: {updated}</p>

      <p>
        Esta política explica qué son las cookies, cuáles utilizamos en{" "}
        {branding.name} (chefai.fit) y cómo puedes gestionarlas. Cumple con
        el Reglamento (UE) 2016/679 (RGPD) y la Ley 34/2002 de Servicios de
        la Sociedad de la Información (LSSI-CE).
      </p>

      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos que un sitio web guarda en tu
        navegador para recordar información sobre tu visita. Pueden ser
        propias (creadas por nosotros) o de terceros (creadas por servicios
        externos), y pueden caducar al cerrar el navegador (de sesión) o
        persistir en el tiempo (persistentes).
      </p>

      <h2>2. ¿Qué cookies usamos?</h2>
      <p>
        En {branding.name} solo utilizamos <strong>cookies estrictamente
        necesarias</strong> para que la aplicación funcione. No usamos
        cookies de analítica, publicidad ni de redes sociales.
      </p>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Propietario</th>
            <th>Finalidad</th>
            <th>Duración</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>session</code>
            </td>
            <td>{branding.name}</td>
            <td>
              Mantener tu sesión iniciada después del login. Sin ella no
              puedes usar la app.
            </td>
            <td>30 días</td>
            <td>Necesaria</td>
          </tr>
          <tr>
            <td>
              <code>chefai-cookie-consent</code>
            </td>
            <td>{branding.name}</td>
            <td>
              Recordar tu preferencia sobre el aviso de cookies para no
              volver a mostrarlo.
            </td>
            <td>localStorage (no caduca hasta que la borres)</td>
            <td>Necesaria</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Cookies de terceros</h2>
      <p>
        En este momento <strong>no utilizamos cookies de terceros</strong>{" "}
        (Google Analytics, Meta, etc.). Si en el futuro las incorporamos,
        actualizaremos esta política y solicitaremos tu consentimiento
        explícito antes de instalarlas.
      </p>

      <h2>4. ¿Cómo gestionar las cookies?</h2>
      <p>
        Las cookies necesarias no pueden desactivarse ya que son
        imprescindibles para que el servicio funcione (mantener tu sesión).
        Si decides bloquearlas en tu navegador, no podrás iniciar sesión.
      </p>

      <p>
        Puedes configurar tu navegador para rechazar o eliminar cookies en
        cualquier momento:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/kb/proteccion-mejorada-rastreo-firefox-ordenador"
            target="_blank"
            rel="noopener"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/es-es/microsoft-edge"
            target="_blank"
            rel="noopener"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>5. Cambios en esta política</h2>
      <p>
        Podemos actualizar esta política para reflejar cambios en el servicio
        o en la legislación. La fecha de la última actualización aparece al
        principio del documento.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Si tienes dudas sobre cookies o privacidad, escríbenos a{" "}
        <a href={`mailto:${branding.supportEmail}`}>
          {branding.supportEmail}
        </a>
        .
      </p>
    </article>
  );
}
