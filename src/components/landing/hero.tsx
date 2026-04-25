"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--brand)_20%,transparent),transparent_50%)]"
      />
      <div className="mx-auto max-w-7xl px-4 md:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5 text-primary" />
              Recetas con IA, en segundos
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
              Cocina lo que tienes en la nevera, en{" "}
              <span className="text-primary">segundos</span>.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty max-w-xl">
              Indica tus ingredientes, alergias y comensales. La IA te genera
              recetas completas con imagen, valores nutricionales y pasos
              claros — adaptadas a ti.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" render={<Link href="/register" />}>
                Empezar gratis
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/pricing" />}
              >
                Ver planes
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              3 recetas gratis al mes. Sin tarjeta de crédito.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-3xl border bg-card shadow-2xl shadow-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/40 flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span className="ml-3 text-xs text-muted-foreground">
                  panel · generar receta
                </span>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Ingredientes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      "pollo",
                      "arroz",
                      "limón",
                      "ajo",
                      "perejil",
                      "tomate",
                    ].map((i) => (
                      <span
                        key={i}
                        className="rounded-full bg-primary/10 text-primary text-sm px-3 py-1"
                      >
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl border overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-amber-200 via-amber-100 to-orange-200" />
                    <div className="p-3">
                      <p className="font-medium text-sm">Pollo al limón</p>
                      <p className="text-xs text-muted-foreground">
                        420 kcal · 30 min
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-emerald-200 via-lime-100 to-yellow-100" />
                    <div className="p-3">
                      <p className="font-medium text-sm">Arroz aromático</p>
                      <p className="text-xs text-muted-foreground">
                        380 kcal · 25 min
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
