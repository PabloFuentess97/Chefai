"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: 1,
    title: "Indica tus ingredientes",
    body: "Pollo, arroz, limón… escribe lo que tienes a mano y tus restricciones (alergias, lo que no te gusta).",
  },
  {
    n: 2,
    title: "La IA genera 3 recetas",
    body: "En menos de 25 segundos: título, foto, ingredientes con macros, pasos numerados y nutrición por ración.",
  },
  {
    n: 3,
    title: "Cocina y guarda",
    body: "Marca favoritas, ajusta comensales sobre la marcha o exporta a PDF. Tu recetario crece contigo.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-muted/40 border-y">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Tres pasos hasta el plato
          </h2>
          <p className="text-muted-foreground">
            Sin instalar nada, sin libros de cocina, sin perder media hora
            buscando inspiración.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl bg-card border p-6 text-center"
            >
              <div className="size-10 mx-auto rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-lg mb-4">
                {s.n}
              </div>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
