"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "¿Es realmente gratis?",
    a: "Sí. El plan Free incluye 3 recetas al mes sin tarjeta. Puedes pasarte a Pro o Chef cuando quieras.",
  },
  {
    q: "¿Qué hace exactamente la IA?",
    a: "Genera 3 o más recetas distintas adaptadas a tus ingredientes, restricciones y comensales, con foto, ingredientes detallados y nutrición real. La IA es GPT-4 con prompts especializados en cocina.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Cancelas con un clic desde tu panel. Mantienes el acceso hasta el final del periodo facturado y luego pasas a Free.",
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Tarjeta (Visa, Mastercard, Amex) por Stripe y PayPal. Procesamos pagos en euros, sin guardar datos de tarjeta en nuestros servidores.",
  },
  {
    q: "¿Las recetas son seguras para alergias?",
    a: "La IA está instruida con prioridad máxima en respetar la lista de prohibidos. Aun así, revisa siempre el resultado antes de cocinar — la responsabilidad final es tuya.",
  },
  {
    q: "¿Qué pasa con mis datos?",
    a: "Tus recetas son privadas y solo tú las ves. No usamos tu contenido para entrenar IAs y puedes borrar tu cuenta cuando quieras.",
  },
  {
    q: "¿Puedo usarlo desde el móvil?",
    a: "Sí. La app es 100% responsive y está optimizada para móvil. No necesitas instalar nada.",
  },
  {
    q: "¿Hay versión para empresas o cocinas profesionales?",
    a: "Si estás interesado en planes para equipos, escríbenos a soporte y nos ponemos.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="py-20 md:py-28 mx-auto max-w-3xl px-4 md:px-6"
    >
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Preguntas frecuentes
        </h2>
      </div>
      <div className="divide-y rounded-2xl border bg-card">
        {FAQS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group p-5"
    >
      <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
        <span className="font-medium text-left">{q}</span>
        <ChevronDown
          className={cn(
            "size-5 text-muted-foreground transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </summary>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
        {a}
      </p>
    </details>
  );
}
