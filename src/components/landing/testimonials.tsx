"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const QUOTES = [
  {
    name: "Marta R.",
    role: "Madre de dos, plan Pro",
    body: "Antes pasaba 20 minutos buscando qué cocinar. Ahora abro la app, escribo lo que tengo y elijo. Ha cambiado mi semana.",
  },
  {
    name: "Iván M.",
    role: "Celíaco, plan Pro",
    body: "La parte de alergias es lo que me convenció. Pongo gluten en prohibidos y nunca falla. Tranquilidad total.",
  },
  {
    name: "Laia P.",
    role: "Cocinera amateur, plan Chef",
    body: "Las imágenes y los pasos son claros. Me han ayudado a probar técnicas nuevas sin abrumarme.",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 mx-auto max-w-7xl px-4 md:px-6">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Cocinan con nosotros
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {QUOTES.map((q, i) => (
          <motion.figure
            key={q.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl border bg-card p-6"
          >
            <div className="flex gap-0.5 mb-3 text-amber-500">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="size-4 fill-current" />
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed">
              «{q.body}»
            </blockquote>
            <figcaption className="mt-4 text-sm">
              <span className="font-medium">{q.name}</span>
              <span className="text-muted-foreground"> · {q.role}</span>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
