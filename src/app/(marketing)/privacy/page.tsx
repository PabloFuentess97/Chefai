import type { Metadata } from "next";
import { getBranding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Política de privacidad de ChefAI (chefai.fit). Conforme al RGPD y la LOPDGDD. Información sobre datos recogidos, finalidades, derechos del usuario y subprocesadores.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const branding = await getBranding();
  const updated = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="prose prose-stone dark:prose-invert mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
      <h1>Política de privacidad</h1>
      <p className="lead">Última actualización: {updated}</p>

      <p>
        En {branding.name} (chefai.fit) nos tomamos en serio tu privacidad.
        Esta política explica qué datos personales recogemos, con qué
        finalidad, durante cuánto tiempo los conservamos y qué derechos
        tienes. Cumple con el Reglamento (UE) 2016/679 General de
        Protección de Datos (RGPD) y la Ley Orgánica 3/2018 de Protección
        de Datos Personales y garantía de los derechos digitales (LOPDGDD).
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Responsable:</strong> {branding.name}
        </li>
        <li>
          <strong>Sitio web:</strong> https://chefai.fit
        </li>
        <li>
          <strong>Email de contacto y privacidad:</strong>{" "}
          <a href={`mailto:${branding.supportEmail}`}>
            {branding.supportEmail}
          </a>
        </li>
      </ul>

      <h2>2. Datos personales que recogemos</h2>
      <p>Recogemos solo los datos necesarios para prestar el servicio:</p>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> email, nombre (opcional),
          contraseña cifrada (bcrypt, no almacenamos la contraseña en
          texto plano).
        </li>
        <li>
          <strong>Datos de uso:</strong> recetas que generas, ingredientes
          consultados, alergias y preferencias indicadas, objetivo
          nutricional preferido, número de generaciones por mes.
        </li>
        <li>
          <strong>Datos técnicos:</strong> IP, agente de usuario, fecha y
          hora de acceso (en logs de seguridad y rate-limit).
        </li>
        <li>
          <strong>Datos de pago:</strong> el procesamiento lo realizan
          Stripe y/o PayPal. Recibimos un identificador de cliente y el
          estado de la suscripción, pero <strong>nunca</strong> el número
          completo de tu tarjeta.
        </li>
      </ul>

      <h2>3. Finalidades y bases legales</h2>
      <table>
        <thead>
          <tr>
            <th>Finalidad</th>
            <th>Base legal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Crear y mantener tu cuenta, autenticación.</td>
            <td>Ejecución de un contrato (art. 6.1.b RGPD).</td>
          </tr>
          <tr>
            <td>Generar recetas con IA según tus parámetros.</td>
            <td>Ejecución de un contrato.</td>
          </tr>
          <tr>
            <td>Procesar pagos y enviar facturas.</td>
            <td>
              Ejecución de un contrato y obligación legal (normativa fiscal).
            </td>
          </tr>
          <tr>
            <td>Comunicaciones operativas (verificación de email, recuperación de contraseña).</td>
            <td>Ejecución de un contrato.</td>
          </tr>
          <tr>
            <td>Seguridad, prevención de fraude, rate-limiting.</td>
            <td>Interés legítimo (art. 6.1.f RGPD).</td>
          </tr>
          <tr>
            <td>Cumplir obligaciones legales (fiscales, requerimientos judiciales).</td>
            <td>Obligación legal (art. 6.1.c RGPD).</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Conservación de los datos</h2>
      <ul>
        <li>
          <strong>Cuenta activa:</strong> mientras mantengas tu cuenta
          abierta.
        </li>
        <li>
          <strong>Tras cancelar tu cuenta:</strong> hasta 30 días para
          permitir su recuperación, salvo que solicites la supresión
          inmediata.
        </li>
        <li>
          <strong>Datos fiscales:</strong> 6 años conforme al artículo 30
          del Código de Comercio y la normativa tributaria.
        </li>
        <li>
          <strong>Logs de seguridad:</strong> hasta 12 meses.
        </li>
      </ul>

      <h2>5. Destinatarios y subprocesadores</h2>
      <p>
        No vendemos ni cedemos tus datos a terceros con fines comerciales.
        Para prestar el servicio compartimos información estrictamente
        necesaria con:
      </p>
      <ul>
        <li>
          <strong>OpenAI, L.L.C.</strong> (EE. UU.) — Generación de texto
          e imágenes con IA. Las peticiones a OpenAI no incluyen datos
          identificativos del usuario más allá del prompt de la receta.
          OpenAI no entrena con datos enviados por la API según su
          política.
        </li>
        <li>
          <strong>Stripe Payments Europe Ltd</strong> (Irlanda) — Procesado
          de pagos con tarjeta.
        </li>
        <li>
          <strong>PayPal (Europe) S.à r.l.</strong> (Luxemburgo) — Procesado
          de pagos vía PayPal.
        </li>
        <li>
          <strong>Resend, Inc.</strong> (EE. UU.) — Envío de emails
          transaccionales (verificación, recuperación de contraseña).
        </li>
        <li>
          <strong>Hetzner Online GmbH</strong> (Alemania, UE) — Hosting de
          la infraestructura. Los servidores están en territorio UE.
        </li>
      </ul>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos de los subprocesadores indicados están en EE. UU. Las
        transferencias se realizan al amparo del{" "}
        <a
          href="https://commission.europa.eu/document/fa09cbad-dd7d-4684-ae60-be03fcb0fddf_en"
          target="_blank"
          rel="noopener"
        >
          Marco de Privacidad Datos UE-EE. UU. (EU-US Data Privacy Framework)
        </a>{" "}
        y, en su defecto, mediante Cláusulas Contractuales Tipo aprobadas
        por la Comisión Europea.
      </p>

      <h2>7. Tus derechos</h2>
      <p>
        Como titular de los datos puedes ejercer los siguientes derechos:
      </p>
      <ul>
        <li>
          <strong>Acceso:</strong> obtener confirmación sobre si estamos
          tratando tus datos y, en su caso, una copia.
        </li>
        <li>
          <strong>Rectificación:</strong> corregir datos inexactos o
          incompletos.
        </li>
        <li>
          <strong>Supresión («derecho al olvido»):</strong> eliminar tus
          datos cuando ya no sean necesarios.
        </li>
        <li>
          <strong>Oposición:</strong> a tratamientos basados en interés
          legítimo.
        </li>
        <li>
          <strong>Limitación:</strong> restringir el tratamiento en
          determinados supuestos.
        </li>
        <li>
          <strong>Portabilidad:</strong> recibir tus datos en formato
          estructurado y de uso común.
        </li>
        <li>
          <strong>Retirar el consentimiento</strong> en cualquier momento,
          sin que afecte a la licitud del tratamiento previo.
        </li>
      </ul>

      <h3>Cómo ejercerlos</h3>
      <p>
        Escríbenos a{" "}
        <a href={`mailto:${branding.supportEmail}`}>
          {branding.supportEmail}
        </a>{" "}
        indicando claramente qué derecho ejerces. Te responderemos en un
        plazo máximo de un mes (ampliable a dos meses en casos complejos,
        con previa comunicación).
      </p>
      <p>
        Si consideras que no hemos atendido correctamente tu solicitud,
        puedes presentar una reclamación ante la{" "}
        <strong>Agencia Española de Protección de Datos (AEPD)</strong>:{" "}
        <a
          href="https://www.aepd.es/"
          target="_blank"
          rel="noopener"
        >
          www.aepd.es
        </a>
        .
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger
        tus datos: cifrado en tránsito (TLS), contraseñas hasheadas con
        bcrypt, sesiones revocables, rate-limiting, copias de seguridad
        diarias y acceso restringido a la base de datos.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Utilizamos exclusivamente cookies estrictamente necesarias para
        que el servicio funcione (mantener tu sesión iniciada). No usamos
        cookies de analítica ni publicidad. Más información en nuestra{" "}
        <a href="/cookies">política de cookies</a>.
      </p>

      <h2>10. Menores</h2>
      <p>
        El Servicio no está dirigido a menores de 14 años. Si tienes
        constancia de que un menor ha registrado una cuenta sin
        consentimiento de padres o tutores, contáctanos y la suprimiremos.
      </p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Podemos actualizar esta política de privacidad. Si los cambios son
        materiales te avisaremos por email o mediante un aviso destacado en
        la aplicación con antelación razonable.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para cualquier duda sobre privacidad, escríbenos a{" "}
        <a href={`mailto:${branding.supportEmail}`}>
          {branding.supportEmail}
        </a>
        .
      </p>
    </article>
  );
}
