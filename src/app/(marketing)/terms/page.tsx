import { getBranding } from "@/lib/branding";

export const metadata = { title: "Términos y condiciones" };

export default async function TermsPage() {
  const branding = await getBranding();
  return (
    <article className="prose prose-stone dark:prose-invert mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
      <h1>Términos y condiciones</h1>
      <p className="lead">Última actualización: {new Date().getFullYear()}</p>

      <p>
        Bienvenido a {branding.name}. Al usar este servicio, aceptas estos
        términos en su totalidad. Si no estás de acuerdo, no uses la
        aplicación.
      </p>

      <h2>1. Servicio</h2>
      <p>
        {branding.name} es una herramienta de generación de recetas asistida
        por inteligencia artificial. Las recetas son sugerencias generadas
        automáticamente; la responsabilidad final de cocinar y consumir lo
        producido es del usuario.
      </p>

      <h2>2. Cuentas</h2>
      <p>
        Eres responsable de mantener la confidencialidad de tu contraseña y
        de toda actividad bajo tu cuenta. Notifica cualquier acceso no
        autorizado de inmediato a {branding.supportEmail}.
      </p>

      <h2>3. Suscripciones y pagos</h2>
      <p>
        Los planes de pago se renuevan automáticamente al final de cada
        periodo hasta que canceles. Puedes cancelar en cualquier momento
        desde tu panel sin penalización; mantendrás el acceso hasta el final
        del periodo facturado.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>
        No está permitido usar el servicio para fines ilegales, generar
        contenido peligroso, ni intentar vulnerar la seguridad o el límite
        de uso de los planes.
      </p>

      <h2>5. Alergias y responsabilidad</h2>
      <p>
        Aunque la IA respeta las restricciones que indiques, debes revisar
        siempre el resultado antes de cocinar o consumir. {branding.name} no
        se hace responsable de reacciones alérgicas o intolerancias.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        El servicio se ofrece «tal cual». No garantizamos ausencia de
        errores ni que el contenido generado sea apto para todos los
        contextos.
      </p>

      <h2>7. Contacto</h2>
      <p>Para cualquier duda, escríbenos a {branding.supportEmail}.</p>
    </article>
  );
}
