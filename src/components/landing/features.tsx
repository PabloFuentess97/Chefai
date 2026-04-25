"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  ImageIcon,
  ShieldCheck,
  Activity,
  Users,
  FileDown,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Recetas IA realistas",
    body: "3+ recetas distintas por petición, con técnicas y sabores variados, generadas por GPT-4.",
  },
  {
    icon: ImageIcon,
    title: "Imagen por receta",
    body: "Cada plato con foto generada por IA. Despierta el apetito antes de empezar a cocinar.",
  },
  {
    icon: ShieldCheck,
    title: "Alergias y restricciones",
    body: "Define ingredientes prohibidos y la IA los respeta SIEMPRE. Seguridad alimentaria primero.",
  },
  {
    icon: Activity,
    title: "Nutrición real",
    body: "Calorías, proteínas, grasas y carbos por ingrediente y por ración. Coherente y trazable.",
  },
  {
    icon: Users,
    title: "Ajuste de comensales",
    body: "Cambia el número de comensales y todas las cantidades se reescalan al instante.",
  },
  {
    icon: FileDown,
    title: "Exporta a PDF",
    body: "Lleva tus recetas favoritas a la cocina sin pantalla. Compartibles, imprimibles, tuyas.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-20 md:py-28 mx-auto max-w-7xl px-4 md:px-6"
    >
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Todo lo que necesitas para cocinar mejor
        </h2>
        <p className="text-muted-foreground">
          Desde inspiración hasta plato terminado, en una sola pantalla.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border bg-card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="size-10 rounded-lg grid place-items-center bg-primary/10 text-primary mb-4">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
