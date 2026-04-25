import { getBranding } from "@/lib/branding";

export const metadata = { title: "Política de privacidad" };

export default async function PrivacyPage() {
  const branding = await getBranding();
  return (
    <article className="prose prose-stone dark:prose-invert mx-auto max-w-3xl px-4 md:px-6 py-16 md:py-24">
      <h1>Política de privacidad</h1>
      <p className="lead">Última actualización: {new Date().getFullYear()}</p>

      <h2>Datos que recopilamos</h2>
      <p>
        Email, contraseña (cifrada con bcrypt), nombre opcional, recetas que
        generas y datos de pago a través de nuestros proveedores (Stripe,
        PayPal). No almacenamos datos de tarjetas en nuestros servidores.
      </p>

      <h2>Uso de los datos</h2>
      <ul>
        <li>Operar y mejorar el servicio</li>
        <li>Procesar pagos y enviar recibos</li>
        <li>Comunicaciones operativas (verificación de email, recuperación de contraseña)</li>
      </ul>
      <p>
        No vendemos tus datos. No los usamos para entrenar modelos de IA de
        terceros.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes acceder, rectificar, exportar o eliminar tus datos en
        cualquier momento desde tu cuenta o escribiendo a{" "}
        {branding.supportEmail}.
      </p>

      <h2>Subprocesadores</h2>
      <ul>
        <li>OpenAI — generación de texto e imágenes</li>
        <li>Stripe — pagos con tarjeta</li>
        <li>PayPal — pagos vía PayPal</li>
        <li>Resend — emails transaccionales</li>
        <li>Hetzner — infraestructura (UE)</li>
      </ul>

      <h2>Contacto</h2>
      <p>{branding.supportEmail}</p>
    </article>
  );
}
