import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCurrentPlan, planHasFeature } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { ShoppingList } from "@/components/dashboard/shopping-list";
import { AddShoppingItem } from "@/components/dashboard/add-shopping-item";

export const metadata = { title: "Lista de la compra" };

export default async function ShoppingPage() {
  const user = await requireUser();
  const plan = await getCurrentPlan(user.id);
  if (!planHasFeature(plan, "shoppingList")) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <div className="rounded-2xl border bg-card p-8 text-center space-y-3">
          <ShoppingCart className="size-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold tracking-tight">
            Lista de la compra
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Esta función está disponible en planes superiores. Mejora tu plan
            para añadir ingredientes desde recetas y menús.
          </p>
          <Button render={<Link href="/billing" />}>Ver planes</Button>
        </div>
      </div>
    );
  }
  const items = await prisma.shoppingListItem.findMany({
    where: { userId: user.id },
    orderBy: [{ isBought: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Link
        href="/planner"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver al menú
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Lista de la compra
        </h1>
        <p className="text-muted-foreground">
          Marca lo que vayas echando al carro. Las cantidades se suman
          automáticamente cuando añades el mismo ingrediente desde otra
          receta o menú.
        </p>
      </div>

      <AddShoppingItem />

      <ShoppingList
        initialItems={items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          isBought: i.isBought,
        }))}
      />
    </div>
  );
}
