import type { Metadata } from "next";
import { getBranding } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Términos y condiciones de uso de ChefAI (chefai.fit). Información sobre cuentas, suscripciones, cancelación, uso aceptable y responsabilidad.",
  alternates: { canonical: "/terms" },
};

export default async function TermsPage() {
  const branding = await getBranding();
  const updated = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="prose prose-stone dark:prose-invert mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
      <h1>Términos y condiciones</h1>
      <p className="lead">Última actualización: {updated}</p>

      <h2>1. Información general</h2>
      <p>
        Estos términos regulan el uso del servicio {branding.name},
        accesible en <strong>chefai.fit</strong> (en adelante, «el
        Servicio»). Al crear una cuenta o utilizar el Servicio, aceptas
        íntegramente estos términos. Si no estás de acuerdo, no uses la
        aplicación.
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> {branding.name}
        </li>
        <li>
          <strong>Sitio web:</strong> https://chefai.fit
        </li>
        <li>
          <strong>Email de contacto:</strong>{" "}
          <a href={`mailto:${branding.supportEmail}`}>
            {branding.supportEmail}
          </a>
        </li>
      </ul>

      <h2>2. Descripción del Servicio</h2>
      <p>
        {branding.name} es un servicio de generación de recetas culinarias
        asistido por inteligencia artificial. El usuario indica los
        ingredientes que tiene, sus restricciones alimentarias, número de
        comensales y, opcionalmente, su tipo de comida (desayuno, almuerzo,
        merienda, cena) y objetivo nutricional (déficit, mantenimiento,
        volumen, definición, ganar músculo). El Servicio devuelve recetas
        completas con ingredientes, pasos, valores nutricionales por
        ingrediente y por ración y, en planes de pago, una imagen
        ilustrativa generada por IA.
      </p>
      <p>
        Las recetas y los valores nutricionales son <strong>sugerencias
        generadas automáticamente</strong>. Pueden contener errores. Es
        responsabilidad del usuario revisar el resultado antes de cocinar
        o consumir.
      </p>

      <h2>3. Cuenta de usuario</h2>
      <p>
        Para utilizar la mayoría de funciones del Servicio debes registrarte
        proporcionando un email válido y una contraseña. Eres responsable
        de mantener la confidencialidad de tu contraseña y de toda actividad
        realizada bajo tu cuenta. Notifica cualquier acceso no autorizado
        de inmediato a {branding.supportEmail}.
      </p>
      <p>
        Debes ser mayor de 16 años para crear una cuenta. Si eres menor,
        necesitas el consentimiento de tus padres o tutores legales.
      </p>

      <h2>4. Planes y suscripciones</h2>
      <p>
        Ofrecemos un plan gratuito limitado y planes de pago con
        características adicionales. Los precios y características vigentes
        se muestran en{" "}
        <a href="/pricing">chefai.fit/pricing</a>.
      </p>
      <ul>
        <li>
          Las suscripciones de pago se renuevan automáticamente al final de
          cada periodo facturado hasta que las canceles.
        </li>
        <li>
          Puedes cancelar en cualquier momento desde tu panel sin penalización.
          Mantendrás el acceso hasta el final del periodo facturado y luego
          pasarás al plan gratuito.
        </li>
        <li>
          Procesamos pagos con tarjeta a través de Stripe y, opcionalmente,
          mediante PayPal. No almacenamos números de tarjeta en nuestros
          servidores.
        </li>
        <li>
          De acuerdo con el artículo 103.m del Real Decreto Legislativo
          1/2007 (TRLGDCU), al iniciar la prestación del servicio digital
          inmediatamente tras la contratación,{" "}
          <strong>renuncias expresamente al derecho de desistimiento</strong>{" "}
          de 14 días respecto al periodo ya consumido.
        </li>
      </ul>

      <h2>5. Uso aceptable</h2>
      <p>No está permitido usar el Servicio para:</p>
      <ul>
        <li>Fines ilegales o que vulneren derechos de terceros.</li>
        <li>
          Generar contenido peligroso, ofensivo o que pueda causar daño
          (recetas con ingredientes tóxicos, dosis peligrosas, etc.).
        </li>
        <li>
          Vulnerar la seguridad, los límites del plan, hacer ingeniería
          inversa de la API o realizar peticiones automatizadas no
          autorizadas (scraping, bots).
        </li>
        <li>
          Revender, redistribuir o crear servicios derivados del Servicio
          sin nuestro consentimiento por escrito.
        </li>
      </ul>
      <p>
        Nos reservamos el derecho a suspender o cerrar cuentas que infrinjan
        estos términos.
      </p>

      <h2>6. Alergias, intolerancias y responsabilidad alimentaria</h2>
      <p>
        Aunque la IA está instruida con prioridad máxima en respetar los
        ingredientes que indicas como prohibidos por alergias o
        intolerancias, <strong>no podemos garantizar la ausencia total de
        errores</strong>. Antes de cocinar y consumir, revisa siempre los
        ingredientes generados.
      </p>
      <p>
        {branding.name} <strong>no se hace responsable</strong> de
        reacciones alérgicas, intolerancias, intoxicaciones o cualquier
        problema de salud derivado del seguimiento de las recetas
        generadas. Si tienes alergias graves, consulta a un profesional.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        El nombre, logo, diseño y código del Servicio son propiedad de{" "}
        {branding.name}. Las recetas que generes para tu uso personal son
        tuyas y puedes utilizarlas y compartirlas libremente. No autorizamos
        el uso comercial masivo del contenido generado (revistas
        automatizadas, libros con cientos de recetas para venta, etc.) sin
        acuerdo previo.
      </p>

      <h2>8. Servicio prestado «tal cual»</h2>
      <p>
        El Servicio se ofrece sin garantías expresas o implícitas más allá
        de las exigidas por ley. No garantizamos disponibilidad
        ininterrumpida, ausencia de errores, ni que el contenido generado
        sea apto para todos los contextos (médico, dietético profesional,
        etc.).
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        En ningún caso {branding.name} responderá por daños indirectos,
        lucro cesante o pérdida de datos derivados del uso del Servicio.
        La responsabilidad máxima por reclamaciones contractuales se limita
        al importe pagado por el usuario en los doce (12) meses anteriores
        al hecho que originó la reclamación.
      </p>

      <h2>10. Modificación del Servicio y de los términos</h2>
      <p>
        Podemos modificar el Servicio (añadir, mejorar o retirar
        funcionalidades), así como estos términos. Si los cambios son
        materiales, te avisaremos por email o en la propia aplicación con
        antelación razonable. El uso continuado tras la actualización
        implica aceptación.
      </p>

      <h2>11. Privacidad</h2>
      <p>
        El tratamiento de tus datos personales se rige por nuestra{" "}
        <a href="/privacy">Política de privacidad</a> y por la{" "}
        <a href="/cookies">Política de cookies</a>.
      </p>

      <h2>12. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por la legislación española. Para cualquier
        controversia, las partes se someten a los Juzgados y Tribunales del
        domicilio del consumidor, conforme a la normativa aplicable de
        protección al consumidor.
      </p>
      <p>
        Si eres consumidor residente en la UE, también puedes recurrir a la
        plataforma de resolución de litigios en línea de la Comisión
        Europea:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noopener"
        >
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      <h2>13. Contacto</h2>
      <p>
        Para cualquier duda sobre estos términos, escríbenos a{" "}
        <a href={`mailto:${branding.supportEmail}`}>
          {branding.supportEmail}
        </a>
        .
      </p>
    </article>
  );
}
