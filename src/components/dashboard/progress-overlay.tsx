"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, ChefHat } from "lucide-react";

const QUOTES = [
  "El secreto de la buena cocina es el cariño con el que se hace.",
  "Una receta no tiene alma; es el cocinero quien debe darle alma a la receta. — Thomas Keller",
  "Cocinar es como amar: o nos lanzamos a ello con todo el corazón, o lo dejamos. — Harriet Van Horne",
  "La cocina es el corazón de la casa.",
  "El mejor ingrediente es siempre el tiempo.",
  "Si no puedes con el calor de los fogones, sal de la cocina. — Harry Truman",
  "Cocinar bien no significa cocinar caro.",
  "La sencillez es la sofisticación máxima. — Leonardo da Vinci",
  "Hay tres cosas que hacen una buena cena: la conversación, la gente y, casi al final, la comida.",
  "Las prisas son malas consejeras en la cocina.",
  "La gastronomía es una forma de arte que se come.",
  "Un buen plato no necesita 50 ingredientes; necesita los 5 correctos.",
  "El olor del ajo en aceite caliente es la promesa de algo bueno.",
  "Probar la sal es el primer mandamiento del cocinero.",
  "El fuego lento hace los milagros.",
];

export type Phase = {
  label: string;
  weight: number; // relative weight (sum doesn't need to be 100)
};

export function ProgressOverlay({
  open,
  phases,
  expectedSeconds,
  title = "Cocinando tu petición",
  subtitle,
}: {
  open: boolean;
  phases: Phase[];
  expectedSeconds: number;
  title?: string;
  subtitle?: string;
}) {
  const [elapsed, setElapsed] = React.useState(0);
  const [quoteIdx, setQuoteIdx] = React.useState(() =>
    Math.floor(Math.random() * QUOTES.length)
  );

  React.useEffect(() => {
    if (!open) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % QUOTES.length);
    }, 4500);
    return () => clearInterval(id);
  }, [open]);

  // Cap at 95% so we never show 100% before the action returns
  const progress = Math.min(0.95, elapsed / expectedSeconds);

  // Determine active phase by accumulated weight
  const totalWeight = phases.reduce((a, p) => a + p.weight, 0);
  let activeIdx = phases.length - 1;
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    acc += phases[i]!.weight / totalWeight;
    if (progress < acc) {
      activeIdx = i;
      break;
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[55] bg-background/90 backdrop-blur-md grid place-items-center px-4"
          aria-modal
          role="dialog"
          aria-label={title}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-md rounded-3xl border bg-card p-8 space-y-6 shadow-2xl"
          >
            {/* Animated icon */}
            <div className="relative size-20 mx-auto grid place-items-center rounded-2xl bg-primary/10">
              <motion.div
                animate={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChefHat className="size-10 text-primary" />
              </motion.div>
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ scale: [1, 1.25, 1], rotate: [0, 20, -20, 0] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <Sparkles className="size-5 text-amber-500 drop-shadow" />
              </motion.div>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {subtitle ?? `Tarda unos ${expectedSeconds}s. No cierres la pantalla.`}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.2, ease: "linear" }}
                />
              </div>
              <p className="text-[10px] text-right text-muted-foreground tabular-nums">
                {Math.round(progress * 100)}%
              </p>
            </div>

            {/* Phases */}
            <ul className="space-y-2.5">
              {phases.map((p, i) => {
                const done = i < activeIdx;
                const active = i === activeIdx;
                return (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm"
                  >
                    {done ? (
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                    ) : active ? (
                      <Loader2 className="size-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="size-4 rounded-full border-2 border-muted shrink-0" />
                    )}
                    <span
                      className={
                        done
                          ? "text-muted-foreground line-through decoration-muted-foreground/40"
                          : active
                            ? "font-medium"
                            : "text-muted-foreground/60"
                      }
                    >
                      {p.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Rotating quote */}
            <div className="border-t pt-4 min-h-[3rem]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={quoteIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="text-xs italic text-center text-muted-foreground leading-relaxed px-2"
                >
                  «{QUOTES[quoteIdx]}»
                </motion.blockquote>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ----- Predefined phase sets -----

export const SINGLE_RECIPE_PHASES: Phase[] = [
  { label: "Analizando ingredientes y preferencias", weight: 1 },
  { label: "Cocinando 3 recetas con IA", weight: 6 },
  { label: "Generando imágenes de los platos", weight: 3 },
  { label: "Calculando macros y nutrición", weight: 1 },
  { label: "Maquetando tus recetas", weight: 1 },
];

export const DAILY_PLAN_PHASES: Phase[] = [
  { label: "Analizando tu objetivo nutricional", weight: 1 },
  { label: "Buscando recetas en la comunidad", weight: 2 },
  { label: "Generando recetas nuevas con IA", weight: 5 },
  { label: "Encolando imágenes", weight: 1 },
  { label: "Maquetando tu menú diario", weight: 1 },
];

export const WEEKLY_PLAN_PHASES: Phase[] = [
  { label: "Analizando tu objetivo nutricional", weight: 1 },
  { label: "Buscando recetas en la comunidad", weight: 3 },
  { label: "Generando 28 platos con IA", weight: 9 },
  { label: "Encolando imágenes para los workers", weight: 2 },
  { label: "Maquetando tu menú semanal", weight: 1 },
];
