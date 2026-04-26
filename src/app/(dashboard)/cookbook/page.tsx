import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Heart,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  Lock,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { getBranding } from "@/lib/branding";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CookbookDownloadButton } from "@/components/dashboard/cookbook-download";

export const metadata = { title: "Mi recetario" };

export default async function CookbookPage() {
  const user = await requireUser();
  const branding = await getBranding();
  const plan = await getCurrentPlan(user.id);
  const enabled = planHasFeature(plan, "cookbookExport");

  const favorites = await prisma.recipe.findMany({
    where: { userId: user.id, isFavorite: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      cuisine: true,
      imageUrl: true,
      prepMinutes: true,
      cookMinutes: true,
    },
  });

  const cuisinesCount = new Set(
    favorites.map((r) => r.cuisine).filter(Boolean)
  ).size;
  const totalMinutes = favorites.reduce(
    (a, r) => a + (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0),
    0
  );
  const authorName =
    user.name?.trim() || user.email.split("@")[0] || "Chef";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Tu recetario
        </h1>
        <p className="text-muted-foreground">
          Convierte tus recetas favoritas en un libro maquetado, listo para
          imprimir.
        </p>
      </div>

      {/* Hero / Mockup */}
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-stretch">
        <Card className="overflow-hidden">
          <div className="relative aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto lg:h-full">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${branding.color} 0%, color-mix(in oklab, ${branding.color} 30%, #000) 100%)`,
              }}
            />
            {favorites[0]?.imageUrl && (
              <Image
                src={favorites[0].imageUrl}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-60 mix-blend-overlay"
              />
            )}
            <div className="absolute inset-0 flex flex-col justify-between p-8 text-white">
              <div className="text-[10px] tracking-[4px] uppercase font-bold">
                {branding.name}
              </div>
              <div>
                <p className="text-[11px] tracking-[4px] uppercase font-bold opacity-90 mb-3">
                  Recetario personal
                </p>
                <h2 className="text-4xl sm:text-5xl font-bold leading-[1.05] mb-2">
                  La cocina de
                  <br />
                  {authorName}
                </h2>
                <p className="text-base opacity-85 italic">
                  una colección curada — generada con {branding.name}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Qué incluye
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Feat
                icon={<Sparkles className="size-4" />}
                text="Portada con tu nombre y foto destacada"
              />
              <Feat
                icon={<Layers className="size-4" />}
                text="Bienvenida personalizada y estadísticas"
              />
              <Feat
                icon={<BookOpen className="size-4" />}
                text="Índice numerado con todas las recetas"
              />
              <Feat
                icon={<Heart className="size-4" />}
                text="Cada receta a página completa: foto, ingredientes, pasos y nutrición"
              />
              <Feat
                icon={<Clock className="size-4" />}
                text="Maquetado tipo revista — listo para imprimir"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                En tu recetario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Recetas" value={favorites.length} />
                <Stat label="Cocinas" value={cuisinesCount || 0} />
                <Stat
                  label="Horas"
                  value={Math.max(1, Math.round(totalMinutes / 60))}
                />
              </div>
            </CardContent>
          </Card>

          {favorites.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                <p>
                  Aún no tienes favoritas. Marca tus recetas con el corazón
                  para que aparezcan aquí.
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  render={<Link href="/recipes" />}
                >
                  Ver mis recetas
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ) : !enabled ? (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
              <CardContent className="pt-6 space-y-3 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="size-4 text-amber-600" />
                  Plan Pro requerido
                </div>
                <p className="text-muted-foreground">
                  La descarga del recetario en PDF está disponible en los
                  planes Pro y Chef.
                </p>
                <Button render={<Link href="/billing" />}>
                  Ver planes
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <CookbookDownloadButton
              enabled={enabled}
              count={favorites.length}
            />
          )}
        </div>
      </div>

      {/* Preview list of recipes that go in */}
      {favorites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Recetas incluidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="divide-y divide-border/60">
              {favorites.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="font-bold text-primary tabular-nums w-7">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {r.imageUrl ? (
                    <Image
                      src={r.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="size-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="size-12 rounded-md bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    {r.cuisine && (
                      <Badge variant="outline" className="mt-0.5">
                        {r.cuisine}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Feat({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-primary mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
